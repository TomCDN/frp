import type {
  Camera,
  CrewMember,
  Cue,
  DashboardOverview,
  DashboardStats,
  LiveState,
  Message,
  Scene,
  ShotTemplate,
  Show,
  ShowSettings,
  ShowSummary,
  Stage,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson && text ? JSON.parse(text) : text;

  if (!response.ok) {
    const message =
      (isJson && body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `Request mislukt (${response.status})`) || `Request mislukt (${response.status})`;
    throw new ApiError(message, response.status, body);
  }
  return body as T;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
const put = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) });
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });

export const api = {
  health: () => get<{ ok: boolean; lanAddresses: string[] }>('/health'),

  /* ------------------------- Dashboard ------------------------- */
  stats: () => get<DashboardStats>('/dashboard/stats'),
  overview: () => get<DashboardOverview>('/dashboard/overview'),
  recentStages: () =>
    get<Array<{ id: string; name: string; updatedAt: string; widthCm: number; heightCm: number }>>(
      '/dashboard/stages',
    ),
  operatorStatuses: (showId: string) =>
    get<import('../types').OperatorStatus[]>(`/dashboard/operators?showId=${encodeURIComponent(showId)}`),

  /* --------------------------- Stages -------------------------- */
  stages: () => get<Stage[]>('/stages'),
  stage: (id: string) => get<Stage>(`/stages/${id}`),
  createStage: (body: Partial<Stage>) => post<Stage>('/stages', body),
  updateStage: (id: string, body: Partial<Stage>) => put<Stage>(`/stages/${id}`, body),
  duplicateStage: (id: string) => post<Stage>(`/stages/${id}/duplicate`),
  deleteStage: (id: string) => del<void>(`/stages/${id}`),

  /* ---------------------------- Crew --------------------------- */
  crew: () => get<CrewMember[]>('/crew'),
  createCrew: (body: Partial<CrewMember>) => post<CrewMember>('/crew', body),
  updateCrew: (id: string, body: Partial<CrewMember>) => put<CrewMember>(`/crew/${id}`, body),
  deleteCrew: (id: string) => del<void>(`/crew/${id}`),

  /* --------------------------- Cameras ------------------------- */
  cameras: () => get<Camera[]>('/cameras'),
  createCamera: (body: Partial<Camera>) => post<Camera>('/cameras', body),
  updateCamera: (id: string, body: Partial<Camera>) => put<Camera>(`/cameras/${id}`, body),
  deleteCamera: (id: string) => del<void>(`/cameras/${id}`),
  claimCamera: (code: string) =>
    post<{ camera: Camera; crew: CrewMember | null }>('/cameras/claim', { code }),

  /* ---------------------------- Shows -------------------------- */
  shows: () => get<Show[]>('/shows'),
  showSummaries: () => get<ShowSummary[]>('/shows?summaries=true'),
  show: (id: string) => get<Show>(`/shows/${id}`),
  createShow: (body: Partial<Show>) => post<Show>('/shows', body),
  updateShow: (id: string, body: Partial<Show>) => put<Show>(`/shows/${id}`, body),
  duplicateShow: (id: string, name?: string) => post<Show>(`/shows/${id}/duplicate`, { name }),
  createFromTemplate: (templateId: string, name?: string) =>
    post<Show>(`/shows/${templateId}/from-template`, { name }),
  deleteShow: (id: string) => del<void>(`/shows/${id}`),

  /* -------------------------- Show crew ------------------------ */
  showCrew: (showId: string) => get<string[]>(`/shows/${showId}/crew`),
  setShowCrew: (showId: string, crewIds: string[]) =>
    put<string[]>(`/shows/${showId}/crew`, { crewIds }),

  /* --------------------------- Scenes -------------------------- */
  scenes: (showId: string) => get<Scene[]>(`/shows/${showId}/scenes`),
  createScene: (showId: string, body: Partial<Scene>) => post<Scene>(`/shows/${showId}/scenes`, body),
  updateScene: (id: string, body: Partial<Scene>) => put<Scene>(`/scenes/${id}`, body),
  deleteScene: (id: string) => del<void>(`/scenes/${id}`),

  /* ---------------------------- Cues --------------------------- */
  cues: (showId: string) => get<Cue[]>(`/shows/${showId}/cues`),
  createCue: (showId: string, body: Partial<Cue>) => post<Cue>(`/shows/${showId}/cues`, body),
  updateCue: (id: string, body: Partial<Cue>) => put<Cue>(`/cues/${id}`, body),
  duplicateCue: (id: string) => post<Cue>(`/cues/${id}/duplicate`),
  deleteCue: (id: string) => del<void>(`/cues/${id}`),
  reorderCues: (showId: string, cueIds: string[]) =>
    post<Cue[]>(`/shows/${showId}/cues/reorder`, { cueIds }),
  renumberCues: (showId: string) => post<Cue[]>(`/shows/${showId}/cues/renumber`),

  /* ---------------------------- Live --------------------------- */
  liveState: (showId: string) => get<LiveState>(`/live/${showId}/state`),
  setCue: (showId: string, cueId: string | null) => post<LiveState>(`/live/${showId}/cue`, { cueId }),
  nextCue: (showId: string) => post<LiveState>(`/live/${showId}/next`),
  previousCue: (showId: string) => post<LiveState>(`/live/${showId}/previous`),
  skipCue: (showId: string) => post<LiveState>(`/live/${showId}/skip`),
  addAdHocCue: (showId: string, body: { name: string; description?: string; notes?: string }) =>
    post<LiveState>(`/live/${showId}/ad-hoc`, body),
  setRehearsal: (showId: string, rehearsal: boolean) =>
    post<LiveState>(`/live/${showId}/rehearsal`, { rehearsal }),
  setEmergency: (showId: string, message: string) =>
    post<LiveState>(`/live/${showId}/emergency`, { message }),
  sendDirectMessage: (showId: string, crewId: string, message: string) =>
    post<LiveState>(`/live/${showId}/direct`, { crewId, message }),
  clearDirectMessages: (showId: string) => del<LiveState>(`/live/${showId}/direct`),
  acknowledgeCue: (showId: string, cueId: string, cameraId: string, value: boolean) =>
    post<{ ok: boolean }>(`/live/${showId}/acknowledge`, { cueId, cameraId, value }),

  /* -------------------------- Messages ------------------------- */
  messages: (showId: string) => get<Message[]>(`/messages/${showId}`),
  sendMessage: (showId: string, body: Partial<Message>) => post<Message>(`/messages/${showId}`, body),

  /* ------------------------ Shot library ----------------------- */
  shotTemplates: () => get<ShotTemplate[]>('/shot-templates'),
  createShotTemplate: (body: Partial<ShotTemplate>) => post<ShotTemplate>('/shot-templates', body),
  deleteShotTemplate: (id: string) => del<void>(`/shot-templates/${id}`),

  /* --------------------------- Uploads ------------------------- */
  uploadImage: (dataUrl: string) => post<{ url: string }>('/uploads/image', { dataUrl }),
};

export type Api = typeof api;

/** Convenience for updating show settings. */
export type ShowSettingsPatch = Partial<ShowSettings>;
