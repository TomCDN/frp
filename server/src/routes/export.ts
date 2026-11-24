import { Router } from 'express';
import { exportCameraPdf, exportShowPdf } from '../services/pdfService';
import { asyncHandler, notFound, optionalString, requireId } from '../utils/http';

export const exportRouter = Router();

/** Full running order for a show. */
exportRouter.get(
  '/shows/:id/pdf',
  asyncHandler((req, res) => {
    exportShowPdf(res, requireId(req.params.id, 'show-id'));
  }),
);

/** Personal shot list for one camera. */
exportRouter.get(
  '/cameras/:id/pdf',
  asyncHandler((req, res) => {
    const query = req.query as Record<string, string | undefined>;
    const showId = optionalString(query, 'showId', 100);
    exportCameraPdf(res, requireId(req.params.id, 'camera-id'), showId);
  }),
);

/** Personal shot list for a crew member (resolves their camera). */
exportRouter.get(
  '/crew/:id/pdf',
  asyncHandler((req, res) => {
    const query = req.query as Record<string, string | undefined>;
    const showId = optionalString(query, 'showId', 100);
    const { listCrew } = require('../services/crewService') as typeof import('../services/crewService');
    const member = listCrew().find((c) => c.id === requireId(req.params.id, 'crew-id'));
    if (!member) throw notFound('Crewlid niet gevonden');
    if (!member.cameraId) throw notFound('Dit crewlid heeft geen camera toegewezen');
    exportCameraPdf(res, member.cameraId, showId);
  }),
);
