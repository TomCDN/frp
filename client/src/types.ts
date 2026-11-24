/**
 * Domain types for FEY (mirrors the server types).
 */

export type ID = string;

export type StageElementType =
  | 'floor'
  | 'platform'
  | 'backdrop'
  | 'stairs'
  | 'door'
  | 'table'
  | 'chair'
  | 'microphone'
  | 'instrument'
  | 'light'
  | 'marker'
  | 'person'
  | 'group'
  | 'camera'
  | 'label';

export type StageLayer = 'floor' | 'scenery' | 'people' | 'lighting' | 'cameras' | 'overlay';

export interface StageElement {
  id: ID;
  type: StageElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  props: Record<string, unknown>;
  layer: StageLayer;
  locked: boolean;
  visible: boolean;
  groupId?: ID | null;
}

export interface Stage {
  id: ID;
  name: string;
  description: string;
  widthCm: number;
  heightCm: number;
  depthCm: number;
  elements: StageElement[];
  createdAt: string;
  updatedAt: string;
}

export interface Camera {
  id: ID;
  number: number;
  name: string;
  type: string;
  color: string;
  notes: string;
  accessCode: string;
  positionX: number;
  positionY: number;
  direction: number;
  lens: string;
}

export interface CrewMember {
  id: ID;
  name: string;
  photoUrl: string | null;
  cameraId: ID | null;
  role: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShowSettings {
  countdownSeconds: number;
  operatorsCanAcknowledge: boolean;
  alertOnNewCue: boolean;
  timecodeFormat: 'hh:mm:ss' | 'mm:ss' | 'seconds';
  standbyMessage: string;
}

export interface Show {
  id: ID;
  name: string;
  description: string;
  date: string | null;
  location: string;
  stageId: ID | null;
  archived: boolean;
  isTemplate: boolean;
  settings: ShowSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ShowSummary extends Show {
  cueCount: number;
  sceneCount: number;
  crewCount: number;
  cameraCount: number;
}

export interface Scene {
  id: ID;
  showId: ID;
  name: string;
  description: string;
  color: string;
  sortOrder: number;
}

export interface ShotAssignment {
  cameraId: ID;
  shot: string;
  subject: string;
  movement: string;
  notes: string;
}

export interface CuePlacement {
  elementId: ID;
  x: number;
  y: number;
  rotation: number;
}

export interface Cue {
  id: ID;
  showId: ID;
  sceneId: ID | null;
  number: number;
  name: string;
  description: string;
  startSeconds: number | null;
  durationSeconds: number;
  shots: Record<ID, ShotAssignment>;
  placements: CuePlacement[];
  cameraPositions: Record<ID, { x: number; y: number; direction: number }>;
  notes: string;
  referenceImageUrl: string | null;
  shotReferenceUrl: string | null;
  sortOrder: number;
  acknowledged: Record<ID, boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: ID;
  showId: ID;
  fromCrewId: ID | null;
  fromName: string;
  toCrewId: ID | null;
  text: string;
  kind: 'normal' | 'emergency' | 'direct';
  createdAt: string;
}

export interface LiveState {
  showId: ID;
  currentCueId: ID | null;
  nextCueId: ID | null;
  rehearsal: boolean;
  emergency: string | null;
  directMessages: Record<ID, string>;
  sequence: number;
  updatedAt: string;
}

export interface OperatorStatus {
  crewId: ID;
  cameraId: ID;
  connected: boolean;
  lastSeen: string;
  receivedCueId: ID | null;
  receivedAt: string | null;
  deviceName?: string;
}

export interface ShotTemplate {
  id: ID;
  name: string;
  description: string;
  movement: string;
  icon: string;
}

export interface DashboardStats {
  showCount: number;
  upcomingShowCount: number;
  archivedShowCount: number;
  stageCount: number;
  cueCount: number;
  activeCrewCount: number;
  cameraCount: number;
  sceneCount: number;
}

export interface DashboardOverview {
  upcoming: ShowSummary[];
  recent: ShowSummary[];
  templates: ShowSummary[];
  archived: ShowSummary[];
}
