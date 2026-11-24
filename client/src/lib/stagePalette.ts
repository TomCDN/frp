/**
 * The colours of the stage, taken from the "Camerahandboek".
 *
 * The handbook draws the stage as a printed floor plan: a cream podium with
 * maroon coulisses on both sides, a dark navy bar for the cameras and blue
 * dashed circles for the stage zones. These constants keep every renderer
 * (live view, operator view, stage builder) visually identical.
 */
export const STAGE_COLORS = {
  /** The podium floor. */
  floor: '#f2e8d5',
  /** A darker cream, used for the grid on the floor. */
  floorGrid: '#d8c9a8',
  /** The strip at the back of the stage ("PODIUM (achter)"). */
  upstage: '#f7f1e4',
  /** The border of the stage. */
  outline: '#c9b894',
  /** The front edge of the stage, towards the audience. */
  frontEdge: '#b2453c',
  /** The coulisses on the left and right side of the stage. */
  coulisse: '#b2453c',
  /** The bar behind the audience where the cameras stand. */
  cameraBar: '#31435c',
  /** The stage zones (LA, MA, RA, LV, MV, RV). */
  zone: '#4c8dff',
  /** The audience. */
  audience: '#dfe6ee',
  /** The line from a camera to its target. */
  target: '#2f9e44',
  /** The colour used for the selection outline in the stage builder. */
  selection: '#4c8dff',
  /** The colour of the text on the stage. */
  text: '#1b2430',
  /** The colour of the secondary text on the stage. */
  textMuted: '#5c6b7a',
} as const;

/** The colours of the three status cards in the handbook. */
export const STATUS_COLORS = {
  /** "LIVE": the operator is on air. */
  live: '#e03131',
  /** "STRAKS LIVE": the shot is being prepared. */
  next: '#2f9e44',
  /** "STAND-BY": nothing to do yet. */
  standby: '#7a8794',
} as const;
