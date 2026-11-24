import { Router } from 'express';
import {
  createStage,
  deleteStage,
  duplicateStage,
  getStage,
  listStages,
  updateStage,
} from '../services/stageService';
import { asyncHandler, badRequest, notFound, optionalNumber, optionalString, requireId } from '../utils/http';

export const stagesRouter = Router();

stagesRouter.get(
  '/',
  asyncHandler((_req, res) => {
    res.json(listStages());
  }),
);

stagesRouter.get(
  '/:id',
  asyncHandler((req, res) => {
    const stage = getStage(requireId(req.params.id, 'stage-id'));
    if (!stage) throw notFound('Podium niet gevonden');
    res.json(stage);
  }),
);

stagesRouter.post(
  '/',
  asyncHandler((req, res) => {
    const body = req.body as Record<string, unknown>;
    const stage = createStage({
      name: optionalString(body, 'name', 200),
      description: optionalString(body, 'description', 2000),
      widthCm: optionalNumber(body, 'widthCm'),
      heightCm: optionalNumber(body, 'heightCm'),
      depthCm: optionalNumber(body, 'depthCm'),
    });
    res.status(201).json(stage);
  }),
);

stagesRouter.put(
  '/:id',
  asyncHandler((req, res) => {
    const body = req.body as Record<string, unknown>;
    const stage = updateStage(requireId(req.params.id, 'stage-id'), {
      name: optionalString(body, 'name', 200),
      description: optionalString(body, 'description', 2000),
      widthCm: optionalNumber(body, 'widthCm'),
      heightCm: optionalNumber(body, 'heightCm'),
      depthCm: optionalNumber(body, 'depthCm'),
      elements: Array.isArray(body.elements) ? (body.elements as never[]) : undefined,
    });
    if (!stage) throw notFound('Podium niet gevonden');
    res.json(stage);
  }),
);

stagesRouter.post(
  '/:id/duplicate',
  asyncHandler((req, res) => {
    const stage = duplicateStage(requireId(req.params.id, 'stage-id'));
    if (!stage) throw notFound('Podium niet gevonden');
    res.status(201).json(stage);
  }),
);

stagesRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const removed = deleteStage(requireId(req.params.id, 'stage-id'));
    if (!removed) throw notFound('Podium niet gevonden');
    res.status(204).send();
  }),
);
