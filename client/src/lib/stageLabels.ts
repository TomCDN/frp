import type { StageElement } from '../types';
import { elementText } from './stageGeometry';

/**
 * Label layout helpers shared by the stage renderers.
 *
 * Stage elements are labelled with their name, but elements can be placed
 * close together, which makes the labels overlap and become unreadable. The
 * helpers below measure the rendered width of a label and nudge overlapping
 * labels apart so that every label stays legible.
 */

/** The desired placement of a single label, in canvas pixels. */
export interface LabelPlacement {
  /** Id of the element the label belongs to. */
  id: string;
  /** The text that is drawn. */
  text: string;
  /** Font size the label is rendered with. */
  fontSize: number;
  /** Horizontal centre of the label. */
  cx: number;
  /** Preferred top edge of the label. */
  top: number;
  /** Half of the rendered width of the label. */
  halfWidth: number;
  /**
   * Movable labels are shifted to avoid overlapping another label. Labels that
   * belong to a fixed shape keep their position and act as obstacles.
   */
  movable: boolean;
}

/** The shift that has to be applied to a label to resolve an overlap. */
export interface LabelOffset {
  dx: number;
  dy: number;
}

/** Where and how the label of a stage element is drawn. */
export interface ElementLabel {
  text: string;
  fontSize: number;
  bold: boolean;
  /** Horizontal centre of the label. */
  cx: number;
  /** Preferred top edge of the label. */
  top: number;
  /** Half of the rendered width of the label. */
  halfWidth: number;
  /** Whether the label may be moved to avoid an overlap. */
  movable: boolean;
}

const SCENERY_TYPES = new Set(['floor', 'platform', 'backdrop', 'stairs', 'door', 'table', 'chair']);

let measureContext: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureContext) return measureContext;
  if (typeof document === 'undefined') return null;
  measureContext = document.createElement('canvas').getContext('2d');
  return measureContext;
}

/**
 * Measures the rendered width of a label.
 *
 * Konva renders text with Arial by default, so the same font is used here to
 * get matching measurements.
 */
export function measureLabelWidth(text: string, fontSize: number, bold = false): number {
  const context = getMeasureContext();
  if (!context) return text.length * fontSize * 0.6;
  context.font = `${bold ? 'bold ' : ''}${fontSize}px Arial`;
  return context.measureText(text).width;
}

/**
 * Computes where the name label of an actor (person or group) is drawn.
 *
 * The label is centred underneath the actor. `px` and `py` are the position of
 * the actor in canvas pixels, which differs from the base stage position when
 * a cue moves the actor.
 */
export function actorLabel(
  element: StageElement,
  px: number,
  py: number,
  scale: number,
  fontSize = 11,
): ElementLabel {
  const w = element.width * scale;
  const h = element.height * scale;
  const text = element.name || 'Naamloos';
  const radius = Math.min(w, h) / 2;
  const isGroup = element.type === 'group';
  return {
    text,
    fontSize,
    bold: false,
    cx: px,
    top: py + (isGroup ? h / 2 + 4 : radius + 4),
    halfWidth: measureLabelWidth(text, fontSize) / 2,
    movable: true,
  };
}

/**
 * Computes where the label of a stage element is drawn.
 *
 * Returns `null` for elements that are not labelled.
 */
export function elementLabel(
  element: StageElement,
  scale: number,
  offsetX: number,
  offsetY: number,
): ElementLabel | null {
  const w = element.width * scale;
  const h = element.height * scale;
  const x = offsetX + element.x * scale;
  const y = offsetY + element.y * scale;

  if (element.type === 'person' || element.type === 'group') {
    return actorLabel(element, x, y, scale);
  }

  if (SCENERY_TYPES.has(element.type)) {
    if (!element.name) return null;
    const fontSize = 10;
    return {
      text: element.name,
      fontSize,
      bold: false,
      cx: x,
      top: y - 6,
      // The text is drawn inside the shape, so it can never be wider.
      halfWidth: Math.min(measureLabelWidth(element.name, fontSize) / 2, w / 2),
      movable: false,
    };
  }

  if (element.type === 'label') {
    const text = elementText(element);
    if (!text) return null;
    const fontSize = Math.max(9, Math.min(18, h * 0.5));
    return {
      text,
      fontSize,
      bold: true,
      cx: x,
      top: y - 7,
      halfWidth: Math.min(measureLabelWidth(text, fontSize, true) / 2, w / 2),
      movable: false,
    };
  }

  return null;
}

/**
 * Resolves overlapping labels.
 *
 * Labels that belong to a fixed shape keep their position and act as
 * obstacles. Movable labels are pushed below the label they collide with;
 * when that would move them out of the canvas they are moved up instead. The
 * horizontal position never changes, so a label stays attached to its element.
 */
export function placeLabels(
  placements: LabelPlacement[],
  options: { gap?: number; minY?: number; maxY?: number } = {},
): Map<string, LabelOffset> {
  const gap = options.gap ?? 3;
  const minY = options.minY ?? 0;
  const maxY = options.maxY ?? Number.POSITIVE_INFINITY;

  const offsets = new Map<string, LabelOffset>();
  const anchored = placements.filter((placement) => !placement.movable);
  const movable = [...placements.filter((placement) => placement.movable)].sort(
    (a, b) => a.top - b.top || a.cx - b.cx,
  );

  interface Box {
    left: number;
    right: number;
    top: number;
    bottom: number;
  }

  const boxOf = (placement: LabelPlacement, top: number): Box => ({
    left: placement.cx - placement.halfWidth,
    right: placement.cx + placement.halfWidth,
    top,
    bottom: top + placement.fontSize,
  });

  const placed: Box[] = anchored.map((placement) => boxOf(placement, placement.top));

  const clashWith = (box: Box) =>
    placed.find(
      (other) =>
        box.right > other.left && box.left < other.right && box.bottom > other.top && box.top < other.bottom,
    );

  for (const placement of movable) {
    const box = boxOf(placement, placement.top);

    let top = placement.top;
    for (let attempt = 0; attempt < 60; attempt++) {
      box.top = top;
      box.bottom = top + placement.fontSize;
      const clash = clashWith(box);
      if (!clash) break;
      top = clash.bottom + gap;
    }

    if (top + placement.fontSize > maxY) {
      let up = placement.top;
      let fits = true;
      for (let attempt = 0; attempt < 60; attempt++) {
        box.top = up;
        box.bottom = up + placement.fontSize;
        const clash = clashWith(box);
        if (!clash) break;
        const candidate = clash.top - gap - placement.fontSize;
        if (candidate < minY) {
          fits = false;
          break;
        }
        up = candidate;
      }
      if (fits) top = up;
    }

    offsets.set(placement.id, { dx: 0, dy: top - placement.top });
    placed.push({ ...box, top, bottom: top + placement.fontSize });
  }

  return offsets;
}
