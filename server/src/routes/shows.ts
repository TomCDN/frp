import { Router } from 'express';
import {
  createCue,
  createScene,
  createShow,
  createShowFromTemplate,
  deleteCue,
  deleteScene,
  deleteShow,
  duplicateCue,
  duplicateShow,
  getCue,
  getShow,
  listCues,
  listScenes,
  listShowSummaries,
  listShows,
  renumberCues,
  reorderCues,
  setShowCrew,
  getShowCrew,
  updateCue,
  updateScene,
  updateShow,
} from '../services/showService';
import { socketHub } from '../realtime/socketHub';
import { asyncHandler, badRequest, notFound, optionalNumber, optionalString, requireId } from '../utils/http';
import type { Cue, ShowSettings } from '../types';

export const showsRouter = Router();

/* ----------------------------- Shows ----------------------------- */

showsRouter.get(
  '/',
  asyncHandler((req, res) => {
    const query = req.query as Record<string, string | undefined>;
    if (query.summaries === 'true') {
      res.json(listShowSummaries());
      return;
    }
    const includeArchived = query.archived !== 'false';
    const includeTemplates = query.templates !== 'false';
    res.json(listShows(includeArchived, includeTemplates));
  }),
);

showsRouter.get(
  '/:id',
  asyncHandler((req, res) => {
    const show = getShow(requireId(req.params.id, 'show-id'));
    if (!show) throw notFound('Show niet gevonden');
    res.json(show);
  }),
);

showsRouter.post(
  '/',
  asyncHandler((req, res) => {
    const body = req.body as Record<string, unknown>;
    const show = createShow({
      name: optionalString(body, 'name', 200),
      description: optionalString(body, 'description', 4000),
      date: optionalString(body, 'date', 40) ?? null,
      location: optionalString(body, 'location', 300),
      stageId: optionalString(body, 'stageId', 100) ?? null,
      isTemplate: body.isTemplate === true,
      settings: (body.settings as Partial<ShowSettings>) ?? undefined,
    });
    res.status(201).json(show);
  }),
);

showsRouter.put(
  '/:id',
  asyncHandler((req, res) => {
    const body = req.body as Record<string, unknown>;
    const show = updateShow(requireId(req.params.id, 'show-id'), {
      name: optionalString(body, 'name', 200),
      description: optionalString(body, 'description', 4000),
      date: body.date === null ? null : optionalString(body, 'date', 40),
      location: optionalString(body, 'location', 300),
      stageId: body.stageId === null ? null : optionalString(body, 'stageId', 100),
      archived: typeof body.archived === 'boolean' ? body.archived : undefined,
      isTemplate: typeof body.isTemplate === 'boolean' ? body.isTemplate : undefined,
      settings: (body.settings as Partial<ShowSettings>) ?? undefined,
    });
    if (!show) throw notFound('Show niet gevonden');
    res.json(show);
  }),
);

showsRouter.post(
  '/:id/duplicate',
  asyncHandler((req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const show = duplicateShow(requireId(req.params.id, 'show-id'), optionalString(body, 'name', 200));
    if (!show) throw notFound('Show niet gevonden');
    res.status(201).json(show);
  }),
);

showsRouter.post(
  '/:id/from-template',
  asyncHandler((req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const show = createShowFromTemplate(
      requireId(req.params.id, 'template-id'),
      optionalString(body, 'name', 200),
    );
    if (!show) throw notFound('Template niet gevonden');
    res.status(201).json(show);
  }),
);

showsRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const removed = deleteShow(requireId(req.params.id, 'show-id'));
    if (!removed) throw notFound('Show niet gevonden');
    res.status(204).send();
  }),
);

/* -------------------------- Show crew --------------------------- */

showsRouter.get(
  '/:id/crew',
  asyncHandler((req, res) => {
    res.json(getShowCrew(requireId(req.params.id, 'show-id')));
  }),
);

showsRouter.put(
  '/:id/crew',
  asyncHandler((req, res) => {
    const body = req.body as Record<string, unknown>;
    const crewIds = body.crewIds;
    if (!Array.isArray(crewIds)) throw badRequest('crewIds moet een array zijn');
    res.json(setShowCrew(requireId(req.params.id, 'show-id'), crewIds.map(String)));
  }),
);

/* ----------------------------- Scenes ---------------------------- */

showsRouter.get(
  '/:id/scenes',
  asyncHandler((req, res) => {
    res.json(listScenes(requireId(req.params.id, 'show-id')));
  }),
);

showsRouter.post(
  '/:id/scenes',
  asyncHandler((req, res) => {
    const body = req.body as Record<string, unknown>;
    const scene = createScene(requireId(req.params.id, 'show-id'), {
      name: optionalString(body, 'name', 200),
      description: optionalString(body, 'description', 2000),
      color: optionalString(body, 'color', 40),
      sortOrder: optionalNumber(body, 'sortOrder'),
    });
    if (!scene) throw notFound('Show niet gevonden');
    res.status(201).json(scene);
  }),
);

/* ------------------------------ Cues ----------------------------- */

showsRouter.get(
  '/:id/cues',
  asyncHandler((req, res) => {
    res.json(listCues(requireId(req.params.id, 'show-id')));
  }),
);

showsRouter.post(
  '/:id/cues',
  asyncHandler((req, res) => {
    const body = req.body as Record<string, unknown>;
    const cue = createCue(requireId(req.params.id, 'show-id'), {
      sceneId: optionalString(body, 'sceneId', 100) ?? null,
      name: optionalString(body, 'name', 200),
      description: optionalString(body, 'description', 4000),
      startSeconds: optionalNumber(body, 'startSeconds') ?? null,
      durationSeconds: optionalNumber(body, 'durationSeconds'),
      shots: body.shots as Cue['shots'],
      placements: body.placements as Cue['placements'],
      cameraPositions: body.cameraPositions as Cue['cameraPositions'],
      notes: optionalString(body, 'notes', 4000),
      referenceImageUrl: optionalString(body, 'referenceImageUrl', 500) ?? null,
      shotReferenceUrl: optionalString(body, 'shotReferenceUrl', 500) ?? null,
    });
    if (!cue) throw notFound('Show niet gevonden');
    res.status(201).json(cue);
  }),
);

showsRouter.post(
  '/:id/cues/reorder',
  asyncHandler((req, res) => {
    const body = req.body as Record<string, unknown>;
    const cueIds = body.cueIds;
    if (!Array.isArray(cueIds)) throw badRequest('cueIds moet een array zijn');
    res.json(reorderCues(requireId(req.params.id, 'show-id'), cueIds.map(String)));
  }),
);

showsRouter.post(
  '/:id/cues/renumber',
  asyncHandler((req, res) => {
    res.json(renumberCues(requireId(req.params.id, 'show-id')));
  }),
);

/* -------------------------- Cue by id --------------------------- */

export const cuesRouter = Router();

cuesRouter.put(
  '/:id',
  asyncHandler((req, res) => {
    const body = req.body as Record<string, unknown>;
    const cue = updateCue(requireId(req.params.id, 'cue-id'), {
      sceneId: body.sceneId === null ? null : optionalString(body, 'sceneId', 100),
      number: optionalNumber(body, 'number'),
      name: optionalString(body, 'name', 200),
      description: optionalString(body, 'description', 4000),
      startSeconds: body.startSeconds === null ? null : optionalNumber(body, 'startSeconds'),
      durationSeconds: optionalNumber(body, 'durationSeconds'),
      shots: body.shots as Cue['shots'],
      placements: body.placements as Cue['placements'],
      cameraPositions: body.cameraPositions as Cue['cameraPositions'],
      notes: optionalString(body, 'notes', 4000),
      referenceImageUrl:
        body.referenceImageUrl === null ? null : optionalString(body, 'referenceImageUrl', 500),
      shotReferenceUrl: body.shotReferenceUrl === null ? null : optionalString(body, 'shotReferenceUrl', 500),
      acknowledged: body.acknowledged as Record<string, boolean>,
    });
    if (!cue) throw notFound('Cue niet gevonden');
    res.json(cue);
  }),
);

cuesRouter.post(
  '/:id/duplicate',
  asyncHandler((req, res) => {
    const cue = duplicateCue(requireId(req.params.id, 'cue-id'));
    if (!cue) throw notFound('Cue niet gevonden');
    res.status(201).json(cue);
  }),
);

cuesRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const removed = deleteCue(requireId(req.params.id, 'cue-id'));
    if (!removed) throw notFound('Cue niet gevonden');
    res.status(204).send();
  }),
);

/* ------------------------- Scene by id -------------------------- */

export const scenesRouter = Router();

scenesRouter.put(
  '/:id',
  asyncHandler((req, res) => {
    const body = req.body as Record<string, unknown>;
    const scene = updateScene(requireId(req.params.id, 'scene-id'), {
      name: optionalString(body, 'name', 200),
      description: optionalString(body, 'description', 2000),
      color: optionalString(body, 'color', 40),
      sortOrder: optionalNumber(body, 'sortOrder'),
    });
    if (!scene) throw notFound('Scène niet gevonden');
    res.json(scene);
  }),
);

scenesRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const removed = deleteScene(requireId(req.params.id, 'scene-id'));
    if (!removed) throw notFound('Scène niet gevonden');
    res.status(204).send();
  }),
);
