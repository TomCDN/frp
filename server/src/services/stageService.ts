import { all, get, nowIso, run, transaction } from '../db/database';
import { toStage, toStageElement, type StageElementRow, type StageRow } from '../db/mappers';
import { newId } from '../utils/id';
import type { Stage, StageElement } from '../types';

function readElements(stageId: string): StageElement[] {
  const rows = all<StageElementRow>(
    'SELECT * FROM stage_elements WHERE stage_id = ? ORDER BY sort_order ASC, rowid ASC',
    stageId,
  );
  return rows.map(toStageElement);
}

export function listStages(): Stage[] {
  const rows = all<StageRow>('SELECT * FROM stages ORDER BY updated_at DESC');
  return rows.map((row) => toStage(row, readElements(row.id)));
}

export function getStage(id: string): Stage | undefined {
  const row = get<StageRow>('SELECT * FROM stages WHERE id = ?', id);
  if (!row) return undefined;
  return toStage(row, readElements(row.id));
}

export interface StageInput {
  name?: string;
  description?: string;
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
  elements?: StageElement[];
}

export function createStage(input: StageInput): Stage {
  const id = newId();
  const ts = nowIso();
  const width = Math.max(200, Math.round(input.widthCm ?? 1200));
  const height = Math.max(200, Math.round(input.heightCm ?? 800));
  run(
    `INSERT INTO stages (id, name, description, width_cm, height_cm, depth_cm, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.name?.trim() || 'Nieuw podium',
    input.description?.trim() ?? '',
    width,
    height,
    Math.max(0, Math.round(input.depthCm ?? 200)),
    ts,
    ts,
  );
  if (input.elements?.length) {
    replaceElements(id, input.elements);
  }
  return getStage(id)!;
}

export function updateStage(id: string, input: StageInput): Stage | undefined {
  const existing = get<StageRow>('SELECT * FROM stages WHERE id = ?', id);
  if (!existing) return undefined;
  run(
    `UPDATE stages SET name = ?, description = ?, width_cm = ?, height_cm = ?, depth_cm = ?, updated_at = ?
     WHERE id = ?`,
    input.name?.trim() || existing.name,
    input.description?.trim() ?? existing.description,
    Math.max(200, Math.round(input.widthCm ?? existing.width_cm)),
    Math.max(200, Math.round(input.heightCm ?? existing.height_cm)),
    Math.max(0, Math.round(input.depthCm ?? existing.depth_cm)),
    nowIso(),
    id,
  );
  if (input.elements) {
    replaceElements(id, input.elements);
  }
  return getStage(id);
}

export function replaceElements(stageId: string, elements: StageElement[]): void {
  transaction(() => {
    run('DELETE FROM stage_elements WHERE stage_id = ?', stageId);
    const stmt =
      `INSERT INTO stage_elements
       (id, stage_id, type, name, x, y, width, height, rotation, props, layer, locked, visible, group_id, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    elements.forEach((element, index) => {
      run(
        stmt,
        element.id || newId(),
        stageId,
        element.type,
        element.name ?? '',
        element.x ?? 0,
        element.y ?? 0,
        element.width ?? 100,
        element.height ?? 100,
        element.rotation ?? 0,
        JSON.stringify(element.props ?? {}),
        element.layer ?? 'scenery',
        element.locked ? 1 : 0,
        element.visible === false ? 0 : 1,
        element.groupId ?? null,
        index,
      );
    });
  });
}

export function deleteStage(id: string): boolean {
  const existing = get<StageRow>('SELECT id FROM stages WHERE id = ?', id);
  if (!existing) return false;
  run('DELETE FROM stages WHERE id = ?', id);
  return true;
}

export function duplicateStage(id: string): Stage | undefined {
  const source = getStage(id);
  if (!source) return undefined;
  const copy = createStage({
    name: `${source.name} (kopie)`,
    description: source.description,
    widthCm: source.widthCm,
    heightCm: source.heightCm,
    depthCm: source.depthCm,
    elements: source.elements.map((element) => ({ ...element, id: newId() })),
  });
  return copy;
}
