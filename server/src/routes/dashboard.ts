import { Router } from 'express';
import { all, get } from '../db/database';
import { listCameras } from '../services/crewService';
import { listShowSummaries } from '../services/showService';
import { socketHub } from '../realtime/socketHub';
import { asyncHandler } from '../utils/http';
import type { DashboardStats } from '../types';

export const dashboardRouter = Router();

function count(sql: string, ...params: unknown[]): number {
  return get<{ c: number }>(sql, ...params)?.c ?? 0;
}

dashboardRouter.get(
  '/stats',
  asyncHandler((_req, res) => {
    const stats: DashboardStats = {
      showCount: count('SELECT COUNT(*) AS c FROM shows WHERE is_template = 0'),
      upcomingShowCount: count(
        "SELECT COUNT(*) AS c FROM shows WHERE archived = 0 AND is_template = 0 AND (date IS NULL OR date >= date('now'))",
      ),
      archivedShowCount: count('SELECT COUNT(*) AS c FROM shows WHERE archived = 1'),
      stageCount: count('SELECT COUNT(*) AS c FROM stages'),
      cueCount: count('SELECT COUNT(*) AS c FROM cues'),
      activeCrewCount: count('SELECT COUNT(*) AS c FROM crew'),
      cameraCount: count('SELECT COUNT(*) AS c FROM cameras'),
      sceneCount: count('SELECT COUNT(*) AS c FROM scenes'),
    };
    res.json(stats);
  }),
);

/** Recent + upcoming shows for the dashboard. */
dashboardRouter.get(
  '/overview',
  asyncHandler((_req, res) => {
    const shows = listShowSummaries();
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = shows
      .filter((show) => !show.archived && !show.isTemplate && show.date && show.date >= today)
      .sort((a, b) => (a.date! < b.date! ? -1 : 1));
    const recent = shows
      .filter((show) => !show.archived && !show.isTemplate && (!show.date || show.date < today))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    res.json({
      upcoming,
      recent,
      templates: shows.filter((show) => show.isTemplate),
      archived: shows.filter((show) => show.archived),
    });
  }),
);

/** Recently edited stages for the dashboard. */
dashboardRouter.get(
  '/stages',
  asyncHandler((_req, res) => {
    const rows = all<{ id: string; name: string; updated_at: string; width_cm: number; height_cm: number }>(
      'SELECT id, name, updated_at, width_cm, height_cm FROM stages ORDER BY updated_at DESC LIMIT 8',
    );
    res.json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        updatedAt: row.updated_at,
        widthCm: row.width_cm,
        heightCm: row.height_cm,
      })),
    );
  }),
);

/** Live connection status of all camera operators (status indicators). */
dashboardRouter.get(
  '/operators',
  asyncHandler((req, res) => {
    const query = req.query as Record<string, string | undefined>;
    const showId = query.showId;
    if (!showId) {
      res.json([]);
      return;
    }
    res.json(socketHub.getOperatorStatuses(showId));
  }),
);

/** All cameras (used to show crew without a camera assignment). */
dashboardRouter.get(
  '/cameras',
  asyncHandler((_req, res) => {
    res.json(listCameras());
  }),
);
