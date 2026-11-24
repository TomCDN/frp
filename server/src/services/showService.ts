import { all, get, nowIso, run, transaction } from '../db/database';
import {
  DEFAULT_SHOW_SETTINGS,
  toCue,
  toScene,
  toShow,
  type CueRow,
  type SceneRow,
  type ShowRow,
} from '../db/mappers';
import { newId } from '../utils/id';
import type { Cue, Scene, Show, ShowSettings, ShowSummary } from '../types';

/* ------------------------------------------------------------------ */
/* Shows                                                              */
/* ------------------------------------------------------------------ */

export function listShows(includeArchived = true, includeTemplates = true): Show[] {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (!includeArchived) clauses.push('archived = 0');
  if (!includeTemplates) clauses.push('is_template = 0');
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return all<ShowRow>(`SELECT * FROM shows ${where} ORDER BY date IS NULL, date ASC, updated_at DESC`, ...params).map(
    toShow,
  );
}

export function getShow(id: string): Show | undefined {
  const row = get<ShowRow>('SELECT * FROM shows WHERE id = ?', id);
  return row ? toShow(row) : undefined;
}

export function listShowSummaries(): ShowSummary[] {
  const shows = listShows();
  return shows.map((show) => {
    const cueCount = get<{ c: number }>('SELECT COUNT(*) AS c FROM cues WHERE show_id = ?', show.id)?.c ?? 0;
    const sceneCount = get<{ c: number }>('SELECT COUNT(*) AS c FROM scenes WHERE show_id = ?', show.id)?.c ?? 0;
    const crewCount = get<{ c: number }>('SELECT COUNT(*) AS c FROM show_crew WHERE show_id = ?', show.id)?.c ?? 0;
    const cameraCount = get<{ c: number }>(
      `SELECT COUNT(*) AS c FROM cameras
       WHERE id IN (
         SELECT c.camera_id FROM show_crew sc
         JOIN crew c ON c.id = sc.crew_id
         WHERE sc.show_id = ? AND c.camera_id IS NOT NULL
       )`,
      show.id,
    )?.c ?? 0;
    return { ...show, cueCount, sceneCount, crewCount, cameraCount };
  });
}

export interface ShowInput {
  name?: string;
  description?: string;
  date?: string | null;
  location?: string;
  stageId?: string | null;
  archived?: boolean;
  isTemplate?: boolean;
  settings?: Partial<ShowSettings>;
}

export function createShow(input: ShowInput): Show {
  const id = newId();
  const ts = nowIso();
  run(
    `INSERT INTO shows (id, name, description, date, location, stage_id, archived, is_template, settings, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.name?.trim() || 'Nieuwe show',
    input.description?.trim() ?? '',
    input.date ?? null,
    input.location?.trim() ?? '',
    input.stageId ?? null,
    input.archived ? 1 : 0,
    input.isTemplate ? 1 : 0,
    JSON.stringify({ ...DEFAULT_SHOW_SETTINGS, ...(input.settings ?? {}) }),
    ts,
    ts,
  );
  return getShow(id)!;
}

export function updateShow(id: string, input: ShowInput): Show | undefined {
  const existing = get<ShowRow>('SELECT * FROM shows WHERE id = ?', id);
  if (!existing) return undefined;
  const current = toShow(existing);
  const settings = { ...current.settings, ...(input.settings ?? {}) };
  run(
    `UPDATE shows SET name = ?, description = ?, date = ?, location = ?, stage_id = ?,
       archived = ?, is_template = ?, settings = ?, updated_at = ? WHERE id = ?`,
    input.name?.trim() || current.name,
    input.description?.trim() ?? current.description,
    input.date === undefined ? current.date : input.date,
    input.location?.trim() ?? current.location,
    input.stageId === undefined ? current.stageId : input.stageId,
    (input.archived ?? current.archived) ? 1 : 0,
    (input.isTemplate ?? current.isTemplate) ? 1 : 0,
    JSON.stringify(settings),
    nowIso(),
    id,
  );
  return getShow(id);
}

export function deleteShow(id: string): boolean {
  const existing = get<ShowRow>('SELECT * FROM shows WHERE id = ?', id);
  if (!existing) return false;
  // A duplicated show owns a private copy of its stage; remove it as well.
  if (existing.owns_stage === 1 && existing.stage_id) {
    run('DELETE FROM stages WHERE id = ?', existing.stage_id);
  }
  run('DELETE FROM shows WHERE id = ?', id);
  return true;
}

/**
 * Duplicates a show including its scenes, cues, crew links and (optionally) a
 * copy of the linked stage so the duplicate is fully self contained.
 */
export function duplicateShow(id: string, name?: string): Show | undefined {
  const source = getShow(id);
  if (!source) return undefined;

  let stageId = source.stageId;
  let ownsStage = false;
  if (stageId) {
    const stage = get<{ id: string; name: string; description: string; width_cm: number; height_cm: number; depth_cm: number }>(
      'SELECT id, name, description, width_cm, height_cm, depth_cm FROM stages WHERE id = ?',
      stageId,
    );
    if (stage) {
      const newStageId = newId();
      const ts = nowIso();
      run(
        `INSERT INTO stages (id, name, description, width_cm, height_cm, depth_cm, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        newStageId,
        `${stage.name} (kopie)`,
        stage.description,
        stage.width_cm,
        stage.height_cm,
        stage.depth_cm,
        ts,
        ts,
      );
      const elementRows = all<{
        id: string; type: string; name: string; x: number; y: number; width: number; height: number;
        rotation: number; props: string; layer: string; locked: number; visible: number; group_id: string | null; sort_order: number;
      }>('SELECT * FROM stage_elements WHERE stage_id = ? ORDER BY sort_order ASC', stageId);
      elementRows.forEach((element) => {
        run(
          `INSERT INTO stage_elements
           (id, stage_id, type, name, x, y, width, height, rotation, props, layer, locked, visible, group_id, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          newId(),
          newStageId,
          element.type,
          element.name,
          element.x,
          element.y,
          element.width,
          element.height,
          element.rotation,
          element.props,
          element.layer,
          element.locked,
          element.visible,
          element.group_id,
          element.sort_order,
        );
      });
      stageId = newStageId;
      ownsStage = true;
    }
  }

  const copyId = newId();
  const ts = nowIso();
  transaction(() => {
    run(
      `INSERT INTO shows (id, name, description, date, location, stage_id, archived, is_template, settings, created_at, updated_at, owns_stage)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
      copyId,
      (name?.trim() || `${source.name} (kopie)`),
      source.description,
      source.date,
      source.location,
      stageId,
      source.isTemplate ? 1 : 0,
      JSON.stringify(source.settings),
      ts,
      ts,
      ownsStage ? 1 : 0,
    );

    for (const row of all<{ crew_id: string }>('SELECT crew_id FROM show_crew WHERE show_id = ?', id)) {
      run('INSERT OR IGNORE INTO show_crew (show_id, crew_id) VALUES (?, ?)', copyId, row.crew_id);
    }

    const sceneIdMap = new Map<string, string>();
    for (const scene of listScenes(id)) {
      const newSceneId = newId();
      sceneIdMap.set(scene.id, newSceneId);
      run(
        `INSERT INTO scenes (id, show_id, name, description, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
        newSceneId,
        copyId,
        scene.name,
        scene.description,
        scene.color,
        scene.sortOrder,
      );
    }

    for (const cue of listCues(id)) {
      run(
        `INSERT INTO cues (id, show_id, scene_id, number, name, description, start_seconds, duration_seconds,
           shots, placements, camera_positions, notes, reference_image_url, shot_reference_url, sort_order,
           acknowledged, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        newId(),
        copyId,
        cue.sceneId ? sceneIdMap.get(cue.sceneId) ?? null : null,
        cue.number,
        cue.name,
        cue.description,
        cue.startSeconds,
        cue.durationSeconds,
        JSON.stringify(cue.shots),
        JSON.stringify(cue.placements),
        JSON.stringify(cue.cameraPositions),
        cue.notes,
        cue.referenceImageUrl,
        cue.shotReferenceUrl,
        cue.sortOrder,
        '{}',
        ts,
        ts,
      );
    }
  });

  return getShow(copyId);
}

/** Creates a new show pre-filled from a template show. */
export function createShowFromTemplate(templateId: string, name?: string): Show | undefined {
  return duplicateShow(templateId, name);
}

/* ------------------------------------------------------------------ */
/* Scenes                                                             */
/* ------------------------------------------------------------------ */

export function listScenes(showId: string): Scene[] {
  return all<SceneRow>('SELECT * FROM scenes WHERE show_id = ? ORDER BY sort_order ASC, rowid ASC', showId).map(
    toScene,
  );
}

export interface SceneInput {
  name?: string;
  description?: string;
  color?: string;
  sortOrder?: number;
}

export function createScene(showId: string, input: SceneInput): Scene | undefined {
  if (!getShow(showId)) return undefined;
  const id = newId();
  const maxOrder = get<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM scenes WHERE show_id = ?', showId)?.m ?? -1;
  run(
    `INSERT INTO scenes (id, show_id, name, description, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    showId,
    input.name?.trim() || 'Nieuwe scène',
    input.description?.trim() ?? '',
    input.color ?? '#64748b',
    input.sortOrder ?? maxOrder + 1,
  );
  const created = get<SceneRow>('SELECT * FROM scenes WHERE id = ?', id);
  return created ? toScene(created) : undefined;
}

export function updateScene(id: string, input: SceneInput): Scene | undefined {
  const row = get<SceneRow>('SELECT * FROM scenes WHERE id = ?', id);
  if (!row) return undefined;
  run(
    'UPDATE scenes SET name = ?, description = ?, color = ?, sort_order = ? WHERE id = ?',
    input.name?.trim() || row.name,
    input.description?.trim() ?? row.description,
    input.color ?? row.color,
    input.sortOrder ?? row.sort_order,
    id,
  );
  const updated = get<SceneRow>('SELECT * FROM scenes WHERE id = ?', id)!;
  return toScene(updated);
}

export function deleteScene(id: string): boolean {
  const row = get<SceneRow>('SELECT id FROM scenes WHERE id = ?', id);
  if (!row) return false;
  run('DELETE FROM scenes WHERE id = ?', id);
  return true;
}

/* ------------------------------------------------------------------ */
/* Cues                                                               */
/* ------------------------------------------------------------------ */

export function listCues(showId: string): Cue[] {
  return all<CueRow>('SELECT * FROM cues WHERE show_id = ? ORDER BY sort_order ASC, number ASC', showId).map(toCue);
}

export function getCue(id: string): Cue | undefined {
  const row = get<CueRow>('SELECT * FROM cues WHERE id = ?', id);
  return row ? toCue(row) : undefined;
}

export interface CueInput {
  sceneId?: string | null;
  number?: number;
  name?: string;
  description?: string;
  startSeconds?: number | null;
  durationSeconds?: number;
  shots?: Cue['shots'];
  placements?: Cue['placements'];
  cameraPositions?: Cue['cameraPositions'];
  notes?: string;
  referenceImageUrl?: string | null;
  shotReferenceUrl?: string | null;
  sortOrder?: number;
  acknowledged?: Record<string, boolean>;
}

/** Renumbers cues 1..N in the given order and persists it. */
export function renumberCues(showId: string): Cue[] {
  const cues = listCues(showId);
  transaction(() => {
    cues.forEach((cue, index) => {
      run('UPDATE cues SET number = ?, sort_order = ? WHERE id = ?', index + 1, index, cue.id);
    });
  });
  return listCues(showId);
}

export function createCue(showId: string, input: CueInput): Cue | undefined {
  if (!getShow(showId)) return undefined;
  const id = newId();
  const ts = nowIso();
  const maxOrder = get<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM cues WHERE show_id = ?', showId)?.m ?? -1;
  const count = get<{ c: number }>('SELECT COUNT(*) AS c FROM cues WHERE show_id = ?', showId)?.c ?? 0;
  run(
    `INSERT INTO cues (id, show_id, scene_id, number, name, description, start_seconds, duration_seconds,
       shots, placements, camera_positions, notes, reference_image_url, shot_reference_url, sort_order,
       acknowledged, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    showId,
    input.sceneId ?? null,
    input.number ?? count + 1,
    input.name?.trim() || `Cue ${count + 1}`,
    input.description?.trim() ?? '',
    input.startSeconds ?? null,
    input.durationSeconds ?? 0,
    JSON.stringify(input.shots ?? {}),
    JSON.stringify(input.placements ?? []),
    JSON.stringify(input.cameraPositions ?? {}),
    input.notes?.trim() ?? '',
    input.referenceImageUrl ?? null,
    input.shotReferenceUrl ?? null,
    input.sortOrder ?? maxOrder + 1,
    JSON.stringify(input.acknowledged ?? {}),
    ts,
    ts,
  );
  return getCue(id);
}

export function updateCue(id: string, input: CueInput): Cue | undefined {
  const row = get<CueRow>('SELECT * FROM cues WHERE id = ?', id);
  if (!row) return undefined;
  run(
    `UPDATE cues SET scene_id = ?, number = ?, name = ?, description = ?, start_seconds = ?, duration_seconds = ?,
       shots = ?, placements = ?, camera_positions = ?, notes = ?, reference_image_url = ?, shot_reference_url = ?,
       sort_order = ?, acknowledged = ?, updated_at = ? WHERE id = ?`,
    input.sceneId === undefined ? row.scene_id : input.sceneId,
    input.number ?? row.number,
    input.name?.trim() || row.name,
    input.description?.trim() ?? row.description,
    input.startSeconds === undefined ? row.start_seconds : input.startSeconds,
    input.durationSeconds ?? row.duration_seconds,
    input.shots === undefined ? row.shots : JSON.stringify(input.shots),
    input.placements === undefined ? row.placements : JSON.stringify(input.placements),
    input.cameraPositions === undefined ? row.camera_positions : JSON.stringify(input.cameraPositions),
    input.notes === undefined ? row.notes : input.notes.trim(),
    input.referenceImageUrl === undefined ? row.reference_image_url : input.referenceImageUrl,
    input.shotReferenceUrl === undefined ? row.shot_reference_url : input.shotReferenceUrl,
    input.sortOrder ?? row.sort_order,
    input.acknowledged === undefined ? row.acknowledged : JSON.stringify(input.acknowledged),
    nowIso(),
    id,
  );
  return getCue(id);
}

export function deleteCue(id: string): boolean {
  const row = get<CueRow>('SELECT id FROM cues WHERE id = ?', id);
  if (!row) return false;
  run('DELETE FROM cues WHERE id = ?', id);
  return true;
}

export function duplicateCue(id: string): Cue | undefined {
  const cue = getCue(id);
  if (!cue) return undefined;
  const maxOrder = get<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM cues WHERE show_id = ?', cue.showId)?.m ?? -1;
  return createCue(cue.showId, {
    sceneId: cue.sceneId,
    name: `${cue.name} (kopie)`,
    description: cue.description,
    startSeconds: cue.startSeconds,
    durationSeconds: cue.durationSeconds,
    shots: cue.shots,
    placements: cue.placements,
    cameraPositions: cue.cameraPositions,
    notes: cue.notes,
    referenceImageUrl: cue.referenceImageUrl,
    shotReferenceUrl: cue.shotReferenceUrl,
    sortOrder: maxOrder + 1,
  });
}

/** Persists a new cue order (array of cue ids) for a show. */
export function reorderCues(showId: string, cueIds: string[]): Cue[] {
  transaction(() => {
    cueIds.forEach((cueId, index) => {
      run('UPDATE cues SET sort_order = ? WHERE id = ? AND show_id = ?', index, cueId, showId);
    });
  });
  return renumberCues(showId);
}

/* ------------------------------------------------------------------ */
/* Show <-> crew links                                                */
/* ------------------------------------------------------------------ */

export function getShowCrew(showId: string): string[] {
  return all<{ crew_id: string }>('SELECT crew_id FROM show_crew WHERE show_id = ?', showId).map((r) => r.crew_id);
}

export function setShowCrew(showId: string, crewIds: string[]): string[] {
  transaction(() => {
    run('DELETE FROM show_crew WHERE show_id = ?', showId);
    for (const crewId of crewIds) {
      run('INSERT OR IGNORE INTO show_crew (show_id, crew_id) VALUES (?, ?)', showId, crewId);
    }
  });
  return getShowCrew(showId);
}
