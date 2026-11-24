import { all, get, nowIso, run } from '../db/database';
import { toLiveState, toMessage, type LiveStateRow, type MessageRow } from '../db/mappers';
import { newId } from '../utils/id';
import { listCues, getCue, getShow } from './showService';
import type { LiveState, Message } from '../types';

/** True when the show exists; used to reject requests for unknown shows. */
export function showExists(showId: string): boolean {
  return Boolean(getShow(showId));
}

export function getLiveState(showId: string): LiveState {
  const row = get<LiveStateRow>('SELECT * FROM live_state WHERE show_id = ?', showId);
  if (row) return toLiveState(row);

  const ts = nowIso();
  run(
    `INSERT INTO live_state (show_id, current_cue_id, next_cue_id, rehearsal, emergency, direct_messages, sequence, updated_at)
     VALUES (?, NULL, NULL, 0, NULL, '{}', 0, ?)`,
    showId,
    ts,
  );
  return {
    showId,
    currentCueId: null,
    nextCueId: null,
    rehearsal: false,
    emergency: null,
    directMessages: {},
    sequence: 0,
    updatedAt: ts,
  };
}

function persist(state: LiveState): LiveState {
  run(
    `UPDATE live_state SET current_cue_id = ?, next_cue_id = ?, rehearsal = ?, emergency = ?,
       direct_messages = ?, sequence = ?, updated_at = ? WHERE show_id = ?`,
    state.currentCueId,
    state.nextCueId,
    state.rehearsal ? 1 : 0,
    state.emergency,
    JSON.stringify(state.directMessages),
    state.sequence,
    state.updatedAt,
    state.showId,
  );
  return state;
}

function bump(state: LiveState): LiveState {
  state.sequence += 1;
  state.updatedAt = nowIso();
  return state;
}

/** Calculates which cue follows the given cue in the show's cue order. */
function nextCueIdAfter(showId: string, cueId: string | null): string | null {
  const cues = listCues(showId);
  if (!cues.length) return null;
  if (!cueId) return cues[0].id;
  const index = cues.findIndex((cue) => cue.id === cueId);
  if (index === -1) return cues[0].id;
  return cues[index + 1]?.id ?? null;
}

export function setCurrentCue(showId: string, cueId: string | null): LiveState {
  const state = getLiveState(showId);
  state.currentCueId = cueId;
  state.nextCueId = nextCueIdAfter(showId, cueId);
  return persist(bump(state));
}

/** Advances to the next cue and returns the new state. */
export function advanceCue(showId: string): LiveState {
  const state = getLiveState(showId);
  const next = nextCueIdAfter(showId, state.currentCueId);
  state.currentCueId = next;
  state.nextCueId = nextCueIdAfter(showId, next);
  return persist(bump(state));
}

/** Steps back to the previous cue. */
export function previousCue(showId: string): LiveState {
  const state = getLiveState(showId);
  const cues = listCues(showId);
  const index = cues.findIndex((cue) => cue.id === state.currentCueId);
  if (index > 0) {
    state.currentCueId = cues[index - 1].id;
  } else {
    state.currentCueId = cues[0]?.id ?? null;
  }
  state.nextCueId = nextCueIdAfter(showId, state.currentCueId);
  return persist(bump(state));
}

/** Skips the current cue (moves to next without marking anything). */
export function skipCue(showId: string): LiveState {
  const state = getLiveState(showId);
  const previousNext = state.nextCueId;
  state.currentCueId = previousNext ?? state.currentCueId;
  state.nextCueId = nextCueIdAfter(showId, state.currentCueId);
  return persist(bump(state));
}

/** Injects an unexpected (ad-hoc) cue at the current position. */
export function insertAdHocCue(
  showId: string,
  name: string,
  description: string,
  notes: string,
): LiveState {
  const cues = listCues(showId);
  const currentIndex = cues.findIndex((cue) => cue.id === getLiveState(showId).currentCueId);
  const sortOrder = currentIndex === -1 ? cues.length : currentIndex + 1;
  const id = newId();
  const ts = nowIso();
  run(
    `INSERT INTO cues (id, show_id, scene_id, number, name, description, start_seconds, duration_seconds,
       shots, placements, camera_positions, notes, reference_image_url, shot_reference_url, sort_order,
       acknowledged, created_at, updated_at)
     VALUES (?, ?, NULL, ?, ?, ?, NULL, 0, '{}', '[]', '{}', ?, NULL, NULL, ?, '{}', ?, ?)`,
    id,
    showId,
    cues.length + 1,
    name.trim() || 'Extra cue',
    description.trim(),
    notes.trim(),
    sortOrder,
    ts,
    ts,
  );
  // Push the following cues one position back.
  const reorder = listCues(showId).map((cue) => cue.id);
  const current = reorder.indexOf(id);
  if (current !== -1) reorder.splice(current, 1);
  reorder.splice(Math.min(sortOrder, reorder.length), 0, id);
  reorder.forEach((cueId, index) => {
    run('UPDATE cues SET sort_order = ?, number = ? WHERE id = ?', index, index + 1, cueId);
  });
  return setCurrentCue(showId, id);
}

export function setRehearsal(showId: string, rehearsal: boolean): LiveState {
  const state = getLiveState(showId);
  state.rehearsal = rehearsal;
  return persist(bump(state));
}

export function setEmergency(showId: string, message: string | null): LiveState {
  const state = getLiveState(showId);
  state.emergency = message?.trim() ? message.trim() : null;
  return persist(bump(state));
}

export function setDirectMessage(showId: string, crewId: string, message: string | null): LiveState {
  const state = getLiveState(showId);
  const next = { ...state.directMessages };
  if (message?.trim()) {
    next[crewId] = message.trim();
  } else {
    delete next[crewId];
  }
  state.directMessages = next;
  return persist(bump(state));
}

export function clearDirectMessages(showId: string): LiveState {
  const state = getLiveState(showId);
  state.directMessages = {};
  return persist(bump(state));
}

/** Records that a camera operator acknowledged the current cue. */
export function acknowledgeCue(cueId: string, cameraId: string, value: boolean): void {
  const cue = getCue(cueId);
  if (!cue) return;
  const acknowledged = { ...cue.acknowledged, [cameraId]: value };
  run('UPDATE cues SET acknowledged = ?, updated_at = ? WHERE id = ?', JSON.stringify(acknowledged), nowIso(), cueId);
}

/* ------------------------------------------------------------------ */
/* Messages                                                           */
/* ------------------------------------------------------------------ */

export function listMessages(showId: string, limit = 100): Message[] {
  return all<MessageRow>(
    'SELECT * FROM messages WHERE show_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?',
    showId,
    limit,
  )
    .map(toMessage)
    .reverse();
}

export function addMessage(input: {
  showId: string;
  fromCrewId?: string | null;
  fromName?: string;
  toCrewId?: string | null;
  text: string;
  kind?: Message['kind'];
}): Message {
  const id = newId();
  const ts = nowIso();
  run(
    `INSERT INTO messages (id, show_id, from_crew_id, from_name, to_crew_id, text, kind, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.showId,
    input.fromCrewId ?? null,
    input.fromName?.trim() || 'Regie',
    input.toCrewId ?? null,
    input.text.trim(),
    input.kind ?? 'normal',
    ts,
  );
  const row = get<MessageRow>('SELECT * FROM messages WHERE id = ?', id)!;
  return toMessage(row);
}
