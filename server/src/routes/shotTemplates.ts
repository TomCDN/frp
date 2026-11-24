import { Router } from 'express';
import { all, get, run } from '../db/database';
import { newId } from '../utils/id';
import { asyncHandler, notFound, optionalString, requireId } from '../utils/http';

export const shotTemplatesRouter = Router();

interface ShotTemplateRow {
  id: string;
  name: string;
  description: string;
  movement: string;
  icon: string;
  sort_order: number;
}

shotTemplatesRouter.get(
  '/',
  asyncHandler((_req, res) => {
    const rows = all<ShotTemplateRow>('SELECT * FROM shot_templates ORDER BY sort_order ASC, name ASC');
    res.json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        movement: row.movement,
        icon: row.icon,
      })),
    );
  }),
);

shotTemplatesRouter.post(
  '/',
  asyncHandler((req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = optionalString(body, 'name', 120);
    if (!name) {
      res.status(400).json({ error: 'Naam is verplicht' });
      return;
    }
    const id = newId();
    const maxOrder = get<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM shot_templates')?.m ?? -1;
    run(
      `INSERT INTO shot_templates (id, name, description, movement, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
      id,
      name,
      optionalString(body, 'description', 500) ?? '',
      optionalString(body, 'movement', 200) ?? '',
      optionalString(body, 'icon', 40) ?? 'camera',
      maxOrder + 1,
    );
    res.status(201).json({
      id,
      name,
      description: optionalString(body, 'description', 500) ?? '',
      movement: optionalString(body, 'movement', 200) ?? '',
      icon: optionalString(body, 'icon', 40) ?? 'camera',
    });
  }),
);

shotTemplatesRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const id = requireId(req.params.id, 'template-id');
    const existing = get<{ id: string }>('SELECT id FROM shot_templates WHERE id = ?', id);
    if (!existing) throw notFound('Shot template niet gevonden');
    run('DELETE FROM shot_templates WHERE id = ?', id);
    res.status(204).send();
  }),
);
