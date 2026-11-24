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
  /** Horizontal alignment of the text around `x`. */
  align: 'center' | 'left';
  /**
   * Horizontal anchor: the centre of the text for `align: 'center'`, the left
   * edge of the text for `align: 'left'`.
   */
  x: number;
  /** Preferred top edge of the label. */
  top: number;
  /** Half of the rendered width of the label. */
  halfWidth: number;
}

/** The shift that has to be applied to a label to resolve an overlap. */
export interface LabelOffset {
  dx: number;
  dy: number;
}

/** Where and how the label of a stage element is drawn. */
export interface ElementLabel extends Omit<LabelPlacement, 'id'> {
  bold: boolean;
}

/**
 * Shapes whose name is drawn inside the shape. The platform, backdrop and
 * the furniture are the surface the show happens on, so their name goes in
 * the top left corner instead of the middle, where the actors stand.
 *
 * The floor itself is not labelled: the stage already says "PODIUM (achter)"
 * at the top, like the floor plan in the handbook.
 */
const CORNER_LABEL_TYPES = new Set(['platform', 'backdrop', 'stairs', 'door', 'table', 'chair']);

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
    align: 'center',
    x: px,
    top: py + (isGroup ? h / 2 + 4 : radius + 4),
    halfWidth: measureLabelWidth(text, fontSize) / 2,
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

  if (CORNER_LABEL_TYPES.has(element.type)) {
    if (!element.name) return null;
    const fontSize = 10;
    const text = element.name;
    return {
      text,
      fontSize,
      bold: false,
      align: 'left',
      x: x - w / 2 + 4,
      top: y - h / 2 + 3,
      halfWidth: measureLabelWidth(text, fontSize) / 2,
    };
  }

  if (element.type === 'marker') {
    const radius = Math.max(w, h) / 2;
    const fontSize = radius * 0.9;
    const text = String(element.props?.symbol ?? 'X');
    return {
      text,
      fontSize,
      bold: true,
      align: 'center' as const,
      x,
      top: y - radius * 0.6,
      halfWidth: measureLabelWidth(text, fontSize, true) / 2,
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
      align: 'center',
      x,
      top: y - 7,
      halfWidth: measureLabelWidth(text, fontSize, true) / 2,
    };
  }

  return null;
}

/**
 * Resolves overlapping labels.
 *
 * Labels are processed from top to bottom. A label that still overlaps an
 * already placed one is pushed below it; when that would move it out of the
 * canvas it is moved up instead. The horizontal position never changes, so a
 * label stays attached to its element.
 */
export function placeLabels(
  placements: LabelPlacement[],
  options: { gap?: number; minY?: number; maxY?: number } = {},
): Map<string, LabelOffset> {
  const gap = options.gap ?? 3;
  const minY = options.minY ?? 0;
  const maxY = options.maxY ?? Number.POSITIVE_INFINITY;

  const offsets = new Map<string, LabelOffset>();
  const ordered = [...placements].sort((a, b) => a.top - b.top || a.x - b.x);

  interface Box {
    left: number;
    right: number;
    top: number;
    bottom: number;
  }

  const boxOf = (placement: LabelPlacement, top: number): Box => {
    const left = placement.align === 'center' ? placement.x - placement.halfWidth : placement.x;
    return {
      left,
      right: left + placement.halfWidth * 2,
      top,
      bottom: top + placement.fontSize,
    };
  };

  const placed: Box[] = [];

  const clashWith = (box: Box) =>
    placed.find(
      (other) =>
        box.right > other.left && box.left < other.right && box.bottom > other.top && box.top < other.bottom,
    );

  for (const placement of ordered) {
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