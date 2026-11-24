/**
 * Shared domain types for FEY.
 * These mirror the database schema and are used by the REST API, the Socket.IO
 * layer and (duplicated) on the client.
 */

export type ID = string;

/* ------------------------------------------------------------------ */
/* Stage builder                                                       */
/* ------------------------------------------------------------------ */

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
  /** Position of the element centre in stage coordinates (cm). */
  x: number;
  y: number;
  /** Size in stage coordinates (cm). */
  width: number;
  height: number;
  /** Rotation in degrees. */
  rotation: number;
  /** Element specific properties (colour, text, camera direction, ...). */
  props: Record<string, unknown>;
  layer: StageLayer;
  locked: boolean;
  visible: boolean;
  /** Optional group id for grouped elements. */
  groupId?: ID | null;
}

export interface Stage {
  id: ID;
  name: string;
  description: string;
  /** Stage floor size in centimetres. */
  widthCm: number;
  heightCm: number;
  /** Background / "upstage" offset in cm used for rendering the proscenium. */
  depthCm: number;
  elements: StageElement[];
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Crew                                                               */
/* ------------------------------------------------------------------ */

export interface Camera {
  id: ID;
  number: number;
  name: string;
  type: string;
  color: string;
  notes: string;
  /** Short code a camera operator types on the iPad to claim this camera. */
  accessCode: string;
  positionX: number;
  positionY: number;
  /** Viewing direction in degrees (0 = right/east, 90 = downstage/south). */
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

/* ------------------------------------------------------------------ */
/* Shows                                                              */
/* ------------------------------------------------------------------ */

export interface ShowSettings {
  /** Show the next-cue count down on the operator devices. */
  countdownSeconds: number;
  /** Allow camera operators to mark a shot as done. */
  operatorsCanAcknowledge: boolean;
  /** Send an audible/visual alert when a new cue goes live. */
  alertOnNewCue: boolean;
  /** Timecode format used in the cue sheet. */
  timecodeFormat: 'hh:mm:ss' | 'mm:ss' | 'seconds';
  /** Text shown on the operator screens when the show is idle. */
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
  /** Subject the camera should follow (person/group element id or free text). */
  subject: string;
  /** Movement instruction, e.g. "slow push in". */
  movement: string;
  notes: string;
}

export interface CuePlacement {
  /** Stage element id of the person/group on stage. */
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
  /** Optional timecode offset in seconds from the start of the show. */
  startSeconds: number | null;
  /** Estimated duration in seconds. */
  durationSeconds: number;
  /** Camera assignments keyed by camera id. */
  shots: Record<ID, ShotAssignment>;
  /** Where actors/groups stand during this cue (stage coordinates in cm). */
  placements: CuePlacement[];
  /** Camera positions + view direction overrides for this cue. */
  cameraPositions: Record<ID, { x: number; y: number; direction: number }>;
  notes: string;
  /** Optional reference image (url) for this cue. */
  referenceImageUrl: string | null;
  /** Optional shot reference image (url). */
  shotReferenceUrl: string | null;
  sortOrder: number;
  /** "done" flags per camera, set by the operator. */
  acknowledged: Record<ID, boolean>;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Messaging                                                          */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Live session                                                       */
/* ------------------------------------------------------------------ */

export interface LiveState {
  showId: ID;
  /** Currently active cue id, null when idle. */
  currentCueId: ID | null;
  /** Next cue id. */
  nextCueId: ID | null;
  /** True while in rehearsal mode. */
  rehearsal: boolean;
  /** Emergency message broadcast to all operators. */
  emergency: string | null;
  /** Direct message per crew member id. */
  directMessages: Record<ID, string>;
  /** Latest sequence number so clients can detect missed updates. */
  sequence: number;
  updatedAt: string;
}

export interface OperatorDevice {
  crewId: ID;
  cameraId: ID;
  connected: boolean;
  lastSeen: string;
  receivedCueId: ID | null;
  receivedAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Shot library                                                       */
/* ------------------------------------------------------------------ */

export interface ShotTemplate {
  id: ID;
  name: string;
  description: string;
  movement: string;
  /** Short SVG-ish icon key used by the UI. */
  icon: string;
}

/* ------------------------------------------------------------------ */
/* API payloads                                                       */
/* ------------------------------------------------------------------ */

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

export interface ApiError {
  error: string;
  details?: unknown;
}
