import { all, get, nowIso, run } from '../db/database';
import { toCamera, toCrew, type CameraRow, type CrewRow } from '../db/mappers';
import { newAccessCode, newId } from '../utils/id';
import type { Camera, CrewMember } from '../types';

const CAMERA_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#22c55e',
  '#eab308',
  '#a855f7',
  '#06b6d4',
  '#f97316',
  '#ec4899',
];

export function listCameras(): Camera[] {
  return all<CameraRow>('SELECT * FROM cameras ORDER BY number ASC').map(toCamera);
}

export function getCamera(id: string): Camera | undefined {
  const row = get<CameraRow>('SELECT * FROM cameras WHERE id = ?', id);
  return row ? toCamera(row) : undefined;
}

export interface CameraInput {
  number?: number;
  name?: string;
  type?: string;
  color?: string;
  notes?: string;
  accessCode?: string;
  positionX?: number;
  positionY?: number;
  direction?: number;
  lens?: string;
}

export function createCamera(input: CameraInput): Camera {
  const id = newId();
  const maxRow = get<{ max: number | null }>('SELECT MAX(number) AS max FROM cameras');
  const nextNumber = input.number ?? (maxRow?.max ?? 0) + 1;
  const color = input.color ?? CAMERA_COLORS[(nextNumber - 1) % CAMERA_COLORS.length];
  run(
    `INSERT INTO cameras (id, number, name, type, color, notes, access_code, position_x, position_y, direction, lens)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    nextNumber,
    input.name?.trim() || `Camera ${nextNumber}`,
    input.type?.trim() ?? 'Wide shot',
    color,
    input.notes?.trim() ?? '',
    (input.accessCode?.trim() || newAccessCode()).toUpperCase(),
    input.positionX ?? 0,
    input.positionY ?? 0,
    input.direction ?? 0,
    input.lens?.trim() ?? '',
  );
  return getCamera(id)!;
}

export function updateCamera(id: string, input: CameraInput): Camera | undefined {
  const existing = get<CameraRow>('SELECT * FROM cameras WHERE id = ?', id);
  if (!existing) return undefined;
  run(
    `UPDATE cameras SET number = ?, name = ?, type = ?, color = ?, notes = ?, access_code = ?,
       position_x = ?, position_y = ?, direction = ?, lens = ? WHERE id = ?`,
    input.number ?? existing.number,
    input.name?.trim() || existing.name,
    input.type?.trim() ?? existing.type,
    input.color ?? existing.color,
    input.notes?.trim() ?? existing.notes,
    (input.accessCode?.trim() || existing.access_code).toUpperCase(),
    input.positionX ?? existing.position_x,
    input.positionY ?? existing.position_y,
    input.direction ?? existing.direction,
    input.lens?.trim() ?? existing.lens,
    id,
  );
  return getCamera(id);
}

export function deleteCamera(id: string): boolean {
  const existing = get<CameraRow>('SELECT id FROM cameras WHERE id = ?', id);
  if (!existing) return false;
  run('DELETE FROM cameras WHERE id = ?', id);
  return true;
}

/* ------------------------------------------------------------------ */
/* Crew                                                               */
/* ------------------------------------------------------------------ */

export function listCrew(): CrewMember[] {
  return all<CrewRow>('SELECT * FROM crew ORDER BY name ASC').map(toCrew);
}

export function getCrew(id: string): CrewMember | undefined {
  const row = get<CrewRow>('SELECT * FROM crew WHERE id = ?', id);
  return row ? toCrew(row) : undefined;
}

export interface CrewInput {
  name?: string;
  photoUrl?: string | null;
  cameraId?: string | null;
  role?: string;
  notes?: string;
}

export function createCrew(input: CrewInput): CrewMember {
  const id = newId();
  const ts = nowIso();
  run(
    `INSERT INTO crew (id, name, photo_url, camera_id, role, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.name?.trim() || 'Nieuwe cameramans',
    input.photoUrl ?? null,
    input.cameraId ?? null,
    input.role?.trim() || 'Cameraman',
    input.notes?.trim() ?? '',
    ts,
    ts,
  );
  return getCrew(id)!;
}

export function updateCrew(id: string, input: CrewInput): CrewMember | undefined {
  const existing = get<CrewRow>('SELECT * FROM crew WHERE id = ?', id);
  if (!existing) return undefined;
  run(
    `UPDATE crew SET name = ?, photo_url = ?, camera_id = ?, role = ?, notes = ?, updated_at = ? WHERE id = ?`,
    input.name?.trim() || existing.name,
    input.photoUrl === undefined ? existing.photo_url : input.photoUrl,
    input.cameraId === undefined ? existing.camera_id : input.cameraId,
    input.role?.trim() ?? existing.role,
    input.notes?.trim() ?? existing.notes,
    nowIso(),
    id,
  );
  return getCrew(id);
}

export function deleteCrew(id: string): boolean {
  const existing = get<CrewRow>('SELECT id FROM crew WHERE id = ?', id);
  if (!existing) return false;
  run('DELETE FROM crew WHERE id = ?', id);
  return true;
}

/** Finds a camera by its (case insensitive) access code. */
export function findCameraByAccessCode(code: string): Camera | undefined {
  const row = get<CameraRow>('SELECT * FROM cameras WHERE UPPER(access_code) = UPPER(?)', code.trim());
  return row ? toCamera(row) : undefined;
}

/** Finds the crew member assigned to a given camera id. */
export function findCrewByCamera(cameraId: string): CrewMember | undefined {
  const row = get<CrewRow>('SELECT * FROM crew WHERE camera_id = ?', cameraId);
  return row ? toCrew(row) : undefined;
}
