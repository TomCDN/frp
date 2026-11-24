import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { UPLOADS_DIR, UPLOAD_MAX_BYTES } from '../config';
import { newId } from '../utils/id';
import { asyncHandler, badRequest } from '../utils/http';

export const uploadsRouter = Router();

const ALLOWED_MIME = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

/**
 * Accepts a single image upload (base64 in JSON) and stores it in the data
 * folder. Returns a relative URL that the client can use directly.
 */
uploadsRouter.post(
  '/image',
  asyncHandler((req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const dataUrl = body.dataUrl;
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      throw badRequest('dataUrl met een image data-URL is verplicht');
    }
    const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
    if (!match) throw badRequest('Ongeldige data-URL');

    const mime = match[1].toLowerCase();
    const extension = ALLOWED_MIME.get(mime);
    if (!extension) {
      throw badRequest(`Niet ondersteund formaat: ${mime}. Gebruik PNG, JPEG, WEBP of GIF.`);
    }

    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length === 0) throw badRequest('Leeg bestand');
    if (buffer.length > UPLOAD_MAX_BYTES) {
      throw badRequest('Bestand is te groot (max 8 MB)');
    }

    const filename = `${newId()}${extension}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
    res.status(201).json({ url: `/uploads/${filename}` });
  }),
);
