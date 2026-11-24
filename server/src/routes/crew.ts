import { Router } from 'express';
import {
  createCamera,
  createCrew,
  deleteCamera,
  deleteCrew,
  findCameraByAccessCode,
  findCrewByCamera,
  getCamera,
  getCrew,
  listCameras,
  listCrew,
  updateCamera,
  updateCrew,
} from '../services/crewService';
import { asyncHandler, badRequest, notFound, optionalNumber, optionalString, requireId } from '../utils/http';

export const crewRouter = Router();
export const camerasRouter = Router();

/* ----------------------------- Crew ----------------------------- */

crewRouter.get(
  '/',
  asyncHandler((_req, res) => {
    res.json(listCrew());
  }),
);

crewRouter.get(
  '/:id',
  asyncHandler((req, res) => {
    const member = getCrew(requireId(req.params.id, 'crew-id'));
    if (!member) throw notFound('Crewlid niet gevonden');
    res.json(member);
  }),
);

crewRouter.post(
  '/',
  asyncHandler((req, res) => {
    const body = req.body as Record<string, unknown>;
    const member = createCrew({
      name: optionalString(body, 'name', 200),
      photoUrl: optionalString(body, 'photoUrl', 500) ?? null,
      cameraId: optionalString(body, 'cameraId', 100) ?? null,
      role: optionalString(body, 'role', 100),
      notes: optionalString(body, 'notes', 2000),
    });
    res.status(201).json(member);
  }),
);

crewRouter.put(
  '/:id',
  asyncHandler((req, res) => {
    const body = req.body as Record<string, unknown>;
    const member = updateCrew(requireId(req.params.id, 'crew-id'), {
      name: optionalString(body, 'name', 200),
      photoUrl: body.photoUrl === null ? null : optionalString(body, 'photoUrl', 500),
      cameraId: body.cameraId === null ? null : optionalString(body, 'cameraId', 100),
      role: optionalString(body, 'role', 100),
      notes: optionalString(body, 'notes', 2000),
    });
    if (!member) throw notFound('Crewlid niet gevonden');
    res.json(member);
  }),
);

crewRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const removed = deleteCrew(requireId(req.params.id, 'crew-id'));
    if (!removed) throw notFound('Crewlid niet gevonden');
    res.status(204).send();
  }),
);

/* --------------------------- Cameras --------------------------- */

camerasRouter.get(
  '/',
  asyncHandler((_req, res) => {
    res.json(listCameras());
  }),
);

camerasRouter.get(
  '/:id',
  asyncHandler((req, res) => {
    const camera = getCamera(requireId(req.params.id, 'camera-id'));
    if (!camera) throw notFound('Camera niet gevonden');
    res.json(camera);
  }),
);

camerasRouter.post(
  '/',
  asyncHandler((req, res) => {
    const body = req.body as Record<string, unknown>;
    const camera = createCamera({
      number: optionalNumber(body, 'number'),
      name: optionalString(body, 'name', 200),
      type: optionalString(body, 'type', 100),
      color: optionalString(body, 'color', 40),
      notes: optionalString(body, 'notes', 2000),
      accessCode: optionalString(body, 'accessCode', 20),
      positionX: optionalNumber(body, 'positionX'),
      positionY: optionalNumber(body, 'positionY'),
      direction: optionalNumber(body, 'direction'),
      lens: optionalString(body, 'lens', 100),
    });
    res.status(201).json(camera);
  }),
);

camerasRouter.put(
  '/:id',
  asyncHandler((req, res) => {
    const body = req.body as Record<string, unknown>;
    const camera = updateCamera(requireId(req.params.id, 'camera-id'), {
      number: optionalNumber(body, 'number'),
      name: optionalString(body, 'name', 200),
      type: optionalString(body, 'type', 100),
      color: optionalString(body, 'color', 40),
      notes: optionalString(body, 'notes', 2000),
      accessCode: optionalString(body, 'accessCode', 20),
      positionX: optionalNumber(body, 'positionX'),
      positionY: optionalNumber(body, 'positionY'),
      direction: optionalNumber(body, 'direction'),
      lens: optionalString(body, 'lens', 100),
    });
    if (!camera) throw notFound('Camera niet gevonden');
    res.json(camera);
  }),
);

camerasRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const removed = deleteCamera(requireId(req.params.id, 'camera-id'));
    if (!removed) throw notFound('Camera niet gevonden');
    res.status(204).send();
  }),
);

/**
 * Claims a camera using the short access code typed on the iPad.
 * Returns the camera plus the crew member assigned to it.
 */
camerasRouter.post(
  '/claim',
  asyncHandler((req, res) => {
    const body = req.body as Record<string, unknown>;
    const code = optionalString(body, 'code', 20);
    if (!code) throw badRequest('Toegangscode is verplicht');
    const camera = findCameraByAccessCode(code);
    if (!camera) throw notFound('Onbekende toegangscode');
    const crew = findCrewByCamera(camera.id);
    res.json({ camera, crew: crew ?? null });
  }),
);
