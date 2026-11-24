import type { Stage, StageElement, StageElementType, StageLayer } from '../types';

/** Default pixels-per-centimetre used when rendering the stage. */
export const BASE_SCALE = 0.42;

/** Grid step in centimetres used for snapping. */
export const GRID_SIZE = 10;

/** Default sizes (in cm) for newly added elements. */
export const DEFAULT_SIZES: Record<StageElementType, { width: number; height: number }> = {
  floor: { width: 1200, height: 800 },
  platform: { width: 600, height: 200 },
  backdrop: { width: 1000, height: 80 },
  stairs: { width: 120, height: 180 },
  door: { width: 80, height: 130 },
  table: { width: 160, height: 80 },
  chair: { width: 60, height: 60 },
  microphone: { width: 40, height: 40 },
  instrument: { width: 140, height: 90 },
  light: { width: 60, height: 60 },
  marker: { width: 50, height: 50 },
  person: { width: 50, height: 50 },
  group: { width: 180, height: 90 },
  camera: { width: 50, height: 50 },
  label: { width: 300, height: 40 },
};

/** Default colour per element type. */
export const DEFAULT_COLORS: Record<StageElementType, string> = {
  floor: '#f2e8d5',
  platform: '#d8c9a8',
  backdrop: '#31435c',
  stairs: '#c9b894',
  door: '#b2453c',
  table: '#8a6f4e',
  chair: '#a08a68',
  microphone: '#5c6b7a',
  instrument: '#31435c',
  light: '#f0a500',
  marker: '#e03131',
  person: '#e03131',
  group: '#4c8dff',
  camera: '#31435c',
  label: '#1b2430',
};

/** Which layer does an element type belong to by default? */
export const DEFAULT_LAYERS: Record<StageElementType, StageLayer> = {
  floor: 'floor',
  platform: 'scenery',
  backdrop: 'scenery',
  stairs: 'scenery',
  door: 'scenery',
  table: 'scenery',
  chair: 'scenery',
  microphone: 'scenery',
  instrument: 'scenery',
  light: 'lighting',
  marker: 'overlay',
  person: 'people',
  group: 'people',
  camera: 'cameras',
  label: 'overlay',
};

export const LAYER_ORDER: StageLayer[] = ['floor', 'scenery', 'lighting', 'people', 'cameras', 'overlay'];

/** Renders a stage coordinate as a percentage of the stage width/height. */
export function toPercent(value: number, total: number): number {
  if (!total) return 0;
  return (value / total) * 100;
}

/** Snaps a coordinate to the nearest grid step. */
export function snap(value: number, grid = GRID_SIZE): number {
  return Math.round(value / grid) * grid;
}

/** Clamps a value between a minimum and maximum. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Creates a new element of the given type at the given position. */
export function createElement(
  type: StageElementType,
  x: number,
  y: number,
  overrides: Partial<StageElement> = {},
): StageElement {
  const size = DEFAULT_SIZES[type];
  return {
    id: `el-${Math.random().toString(36).slice(2, 10)}`,
    type,
    name: '',
    x,
    y,
    width: size.width,
    height: size.height,
    rotation: 0,
    props: { color: DEFAULT_COLORS[type] },
    layer: DEFAULT_LAYERS[type],
    locked: false,
    visible: true,
    groupId: null,
    ...overrides,
  };
}

/** Reads the colour of an element, falling back to the type default. */
export function elementColor(element: StageElement): string {
  const color = element.props?.color;
  if (typeof color === 'string' && color) return color;
  return DEFAULT_COLORS[element.type];
}

/** Reads the label text of an element. */
export function elementText(element: StageElement): string {
  const text = element.props?.text;
  if (typeof text === 'string' && text) return text;
  return element.name;
}

/** Returns the elements that make up the "actors" of a stage. */
export function actorElements(stage: Stage | null): StageElement[] {
  if (!stage) return [];
  return stage.elements.filter((element) => element.type === 'person' || element.type === 'group');
}

/** Returns the camera elements of a stage. */
export function cameraElements(stage: Stage | null): StageElement[] {
  if (!stage) return [];
  return stage.elements.filter((element) => element.type === 'camera');
}

/**
 * Builds a map of element id -> position for a cue.
 * Placements override the base stage position for that cue.
 */
export function buildCuePositions(
  stage: Stage | null,
  placements: Array<{ elementId: string; x: number; y: number; rotation: number }>,
): Map<string, { x: number; y: number; rotation: number }> {
  const map = new Map<string, { x: number; y: number; rotation: number }>();
  if (!stage) return map;
  for (const element of stage.elements) {
    map.set(element.id, { x: element.x, y: element.y, rotation: element.rotation });
  }
  for (const placement of placements ?? []) {
    map.set(placement.elementId, {
      x: placement.x,
      y: placement.y,
      rotation: placement.rotation ?? 0,
    });
  }
  return map;
}
