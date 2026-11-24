import { Router } from 'express';
import {
  acknowledgeCue,
  addMessage,
  advanceCue,
  clearDirectMessages,
  getLiveState,
  insertAdHocCue,
  listMessages,
  previousCue,
  setCurrentCue,
  setDirectMessage,
  setEmergency,
  setRehearsal,
  showExists,
  skipCue,
} from '../services/liveService';
import { socketHub } from '../realtime/socketHub';
import { asyncHandler, badRequest, notFound, optionalString, requireId } from '../utils/http';

export const liveRouter = Router();

/** Broadcasts the current live state of a show to all connected devices. */
function broadcast(showId: string): void {
  socketHub.broadcastLiveState(showId, getLiveState(showId));
}

/** Resolves the show id from the route and rejects unknown shows with 404. */
function requireShow(showId: string): string {
  if (!showExists(showId)) throw notFound('Show niet gevonden');
  return showId;
}

liveRouter.get(
  '/:showId/state',
  asyncHandler((req, res) => {
    const showId = requireShow(requireId(req.params.showId, 'show-id'));
    res.json(getLiveState(showId));
  }),
);

/** Operator device announces itself and starts receiving live updates. */
liveRouter.post(
  '/:showId/join',
  asyncHandler((req, res) => {
    const showId = requireShow(requireId(req.params.showId, 'show-id'));
    const body = (req.body ?? {}) as Record<string, unknown>;
    const crewId = optionalString(body, 'crewId', 100);
    const cameraId = optionalString(body, 'cameraId', 100);
    if (!crewId || !cameraId) throw badRequest('crewId en cameraId zijn verplicht');
    const state = getLiveState(showId);
    res.json({ state, crewId, cameraId });
  }),
);

/** Moves to a specific cue. */
liveRouter.post(
  '/:showId/cue',
  asyncHandler((req, res) => {
    const showId = requireShow(requireId(req.params.showId, 'show-id'));
    const body = (req.body ?? {}) as Record<string, unknown>;
    const cueId = optionalString(body, 'cueId', 100);
    const state = setCurrentCue(showId, cueId ?? null);
    broadcast(showId);
    res.json(state);
  }),
);

/** Advances to the next cue. */
liveRouter.post(
  '/:showId/next',
  asyncHandler((req, res) => {
    const showId = requireShow(requireId(req.params.showId, 'show-id'));
    const state = advanceCue(showId);
    broadcast(showId);
    res.json(state);
  }),
);

/** Goes back to the previous cue. */
liveRouter.post(
  '/:showId/previous',
  asyncHandler((req, res) => {
    const showId = requireShow(requireId(req.params.showId, 'show-id'));
    const state = previousCue(showId);
    broadcast(showId);
    res.json(state);
  }),
);

/** Skips the current cue. */
liveRouter.post(
  '/:showId/skip',
  asyncHandler((req, res) => {
    const showId = requireShow(requireId(req.params.showId, 'show-id'));
    const state = skipCue(showId);
    broadcast(showId);
    res.json(state);
  }),
);

/** Inserts an unexpected cue at the current position and makes it live. */
liveRouter.post(
  '/:showId/ad-hoc',
  asyncHandler((req, res) => {
    const showId = requireShow(requireId(req.params.showId, 'show-id'));
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = optionalString(body, 'name', 200) ?? 'Extra cue';
    const description = optionalString(body, 'description', 2000) ?? '';
    const notes = optionalString(body, 'notes', 2000) ?? '';
    const state = insertAdHocCue(showId, name, description, notes);
    broadcast(showId);
    res.json(state);
  }),
);

/** Toggles rehearsal mode. */
liveRouter.post(
  '/:showId/rehearsal',
  asyncHandler((req, res) => {
    const showId = requireShow(requireId(req.params.showId, 'show-id'));
    const body = (req.body ?? {}) as Record<string, unknown>;
    const rehearsal = body.rehearsal === true;
    const state = setRehearsal(showId, rehearsal);
    broadcast(showId);
    res.json(state);
  }),
);

/** Broadcasts an emergency instruction to every operator. */
liveRouter.post(
  '/:showId/emergency',
  asyncHandler((req, res) => {
    const showId = requireShow(requireId(req.params.showId, 'show-id'));
    const body = (req.body ?? {}) as Record<string, unknown>;
    const message = optionalString(body, 'message', 1000) ?? '';
    const state = setEmergency(showId, message || null);
    broadcast(showId);
    if (message) {
      socketHub.sendToAllOperators(showId, { text: message, fromName: 'Noodmelding', kind: 'emergency' });
    }
    res.json(state);
  }),
);

/** Sends a message to a single camera operator. */
liveRouter.post(
  '/:showId/direct',
  asyncHandler((req, res) => {
    const showId = requireShow(requireId(req.params.showId, 'show-id'));
    const body = (req.body ?? {}) as Record<string, unknown>;
    const crewId = optionalString(body, 'crewId', 100);
    const message = optionalString(body, 'message', 1000);
    if (!crewId) throw badRequest('crewId is verplicht');
    if (!message) throw badRequest('message is verplicht');
    const state = setDirectMessage(showId, crewId, message);
    broadcast(showId);
    socketHub.sendDirectMessage(crewId, { text: message, fromName: 'Regie' });
    res.json(state);
  }),
);

/** Removes all direct messages. */
liveRouter.delete(
  '/:showId/direct',
  asyncHandler((req, res) => {
    const showId = requireShow(requireId(req.params.showId, 'show-id'));
    const state = clearDirectMessages(showId);
    broadcast(showId);
    res.json(state);
  }),
);

/** Operator acknowledges the current cue for their camera. */
liveRouter.post(
  '/:showId/acknowledge',
  asyncHandler((req, res) => {
    const showId = requireShow(requireId(req.params.showId, 'show-id'));
    const body = (req.body ?? {}) as Record<string, unknown>;
    const cueId = optionalString(body, 'cueId', 100);
    const cameraId = optionalString(body, 'cameraId', 100);
    const value = body.value === true;
    if (!cueId || !cameraId) throw badRequest('cueId en cameraId zijn verplicht');
    acknowledgeCue(cueId, cameraId, value);
    res.json({ ok: true });
  }),
);

/* ---------------------------- Messages --------------------------- */

export const messagesRouter = Router();

messagesRouter.get(
  '/:showId',
  asyncHandler((req, res) => {
    const showId = requireShow(requireId(req.params.showId, 'show-id'));
    const query = req.query as Record<string, string | undefined>;
    const limit = Math.min(200, Math.max(1, Number.parseInt(query.limit ?? '100', 10) || 100));
    res.json(listMessages(showId, limit));
  }),
);

messagesRouter.post(
  '/:showId',
  asyncHandler((req, res) => {
    const showId = requireShow(requireId(req.params.showId, 'show-id'));
    const body = (req.body ?? {}) as Record<string, unknown>;
    const text = optionalString(body, 'text', 2000);
    if (!text) throw badRequest('Bericht kan niet leeg zijn');
    const message = addMessage({
      showId,
      fromCrewId: optionalString(body, 'fromCrewId', 100) ?? null,
      fromName: optionalString(body, 'fromName', 100),
      toCrewId: optionalString(body, 'toCrewId', 100) ?? null,
      text,
      kind: (body.kind as 'normal' | 'emergency' | 'direct') ?? 'normal',
    });
    socketHub.sendToAllOperators(showId, {
      text: message.text,
      fromName: message.fromName,
      kind: message.kind,
    });
    res.status(201).json(message);
  }),
);
