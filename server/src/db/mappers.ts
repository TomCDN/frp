import type {
  Camera,
  CrewMember,
  Cue,
  LiveState,
  Message,
  Scene,
  Show,
  ShowSettings,
  Stage,
  StageElement,
} from '../types';

export interface StageRow {
  id: string;
  name: string;
  description: string;
  width_cm: number;
  height_cm: number;
  depth_cm: number;
  created_at: string;
  updated_at: string;
}

export interface StageElementRow {
  id: string;
  stage_id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  props: string;
  layer: string;
  locked: number;
  visible: number;
  group_id: string | null;
  sort_order: number;
}

export interface CameraRow {
  id: string;
  number: number;
  name: string;
  type: string;
  color: string;
  notes: string;
  access_code: string;
  position_x: number;
  position_y: number;
  direction: number;
  lens: string;
}

export interface CrewRow {
  id: string;
  name: string;
  photo_url: string | null;
  camera_id: string | null;
  role: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ShowRow {
  id: string;
  name: string;
  description: string;
  date: string | null;
  location: string;
  stage_id: string | null;
  archived: number;
  is_template: number;
  settings: string;
  created_at: string;
  updated_at: string;
  owns_stage?: number;
}

export interface SceneRow {
  id: string;
  show_id: string;
  name: string;
  description: string;
  color: string;
  sort_order: number;
}

export interface CueRow {
  id: string;
  show_id: string;
  scene_id: string | null;
  number: number;
  name: string;
  description: string;
  start_seconds: number | null;
  duration_seconds: number;
  shots: string;
  placements: string;
  camera_positions: string;
  notes: string;
  reference_image_url: string | null;
  shot_reference_url: string | null;
  sort_order: number;
  acknowledged: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  show_id: string;
  from_crew_id: string | null;
  from_name: string;
  to_crew_id: string | null;
  text: string;
  kind: string;
  created_at: string;
}

export interface LiveStateRow {
  show_id: string;
  current_cue_id: string | null;
  next_cue_id: string | null;
  rehearsal: number;
  emergency: string | null;
  direct_messages: string;
  sequence: number;
  updated_at: string;
}

/** JSON columns may contain malformed data if a user edited the DB by hand. */
export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as T;
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export function toStage(row: StageRow, elements: StageElement[]): Stage {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    widthCm: row.width_cm,
    heightCm: row.height_cm,
    depthCm: row.depth_cm,
    elements,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toStageElement(row: StageElementRow): StageElement {
  return {
    id: row.id,
    type: row.type as StageElement['type'],
    name: row.name,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    rotation: row.rotation,
    props: parseJson<Record<string, unknown>>(row.props, {}),
    layer: row.layer as StageElement['layer'],
    locked: row.locked === 1,
    visible: row.visible === 1,
    groupId: row.group_id,
  };
}

export function toCamera(row: CameraRow): Camera {
  return {
    id: row.id,
    number: row.number,
    name: row.name,
    type: row.type,
    color: row.color,
    notes: row.notes,
    accessCode: row.access_code,
    positionX: row.position_x,
    positionY: row.position_y,
    direction: row.direction,
    lens: row.lens,
  };
}

export function toCrew(row: CrewRow): CrewMember {
  return {
    id: row.id,
    name: row.name,
    photoUrl: row.photo_url,
    cameraId: row.camera_id,
    role: row.role,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const DEFAULT_SHOW_SETTINGS: ShowSettings = {
  countdownSeconds: 5,
  operatorsCanAcknowledge: true,
  alertOnNewCue: true,
  timecodeFormat: 'mm:ss',
  standbyMessage: 'Wachten op regie...',
};

export function toShow(row: ShowRow): Show {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    date: row.date,
    location: row.location,
    stageId: row.stage_id,
    archived: row.archived === 1,
    isTemplate: row.is_template === 1,
    settings: { ...DEFAULT_SHOW_SETTINGS, ...parseJson<Partial<ShowSettings>>(row.settings, {}) },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toScene(row: SceneRow): Scene {
  return {
    id: row.id,
    showId: row.show_id,
    name: row.name,
    description: row.description,
    color: row.color,
    sortOrder: row.sort_order,
  };
}

export function toCue(row: CueRow): Cue {
  return {
    id: row.id,
    showId: row.show_id,
    sceneId: row.scene_id,
    number: row.number,
    name: row.name,
    description: row.description,
    startSeconds: row.start_seconds,
    durationSeconds: row.duration_seconds,
    shots: parseJson(row.shots, {}),
    placements: parseJson(row.placements, []),
    cameraPositions: parseJson(row.camera_positions, {}),
    notes: row.notes,
    referenceImageUrl: row.reference_image_url,
    shotReferenceUrl: row.shot_reference_url,
    sortOrder: row.sort_order,
    acknowledged: parseJson(row.acknowledged, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    showId: row.show_id,
    fromCrewId: row.from_crew_id,
    fromName: row.from_name,
    toCrewId: row.to_crew_id,
    text: row.text,
    kind: row.kind as Message['kind'],
    createdAt: row.created_at,
  };
}

export function toLiveState(row: LiveStateRow): LiveState {
  return {
    showId: row.show_id,
    currentCueId: row.current_cue_id,
    nextCueId: row.next_cue_id,
    rehearsal: row.rehearsal === 1,
    emergency: row.emergency,
    directMessages: parseJson(row.direct_messages, {}),
    sequence: row.sequence,
    updatedAt: row.updated_at,
  };
}
