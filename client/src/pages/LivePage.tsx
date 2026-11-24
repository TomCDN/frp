import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  Zap,
  MessageSquare,
  AlertTriangle,
  Users,
  Play,
  Pause,
  Plus,
  Radio,
  Camera,
  Wifi,
  WifiOff,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '../lib/api';
import { useAsync, useAsyncWhen } from '../hooks/useApi';
import { useSocket } from '../hooks/useSocket';
import { formatTimecode, formatRelative } from '../lib/utils';
import { Badge, Button, EmptyState, Field, Loading, Modal, Toast } from '../components/ui';
import { LiveStageView } from '../components/LiveStageView';
import type { Camera as CameraModel, CrewMember, Cue, LiveState, Show, Stage } from '../types';

export function LivePage() {
  const { showId = '' } = useParams();

  const show = useAsync<Show>(() => api.show(showId));
  const cues = useAsync<Cue[]>(() => api.cues(showId));
  const cameras = useAsync<CameraModel[]>(() => api.cameras());
  const crew = useAsync<CrewMember[]>(() => api.crew());

  const stage = useAsyncWhen<Stage | null>(
    async () => {
      const stageId = show.data?.stageId;
      if (!stageId) return null;
      return api.stage(stageId);
    },
    Boolean(show.data?.stageId),
    [show.data?.stageId],
  );

  const [state, setState] = useState<LiveState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [emergencyText, setEmergencyText] = useState('');
  const [directOpen, setDirectOpen] = useState(false);
  const [directTarget, setDirectTarget] = useState<string>('');
  const [directText, setDirectText] = useState('');
  const [adhocOpen, setAdhocOpen] = useState(false);
  const [adhoc, setAdhoc] = useState({ name: '', description: '', notes: '' });
  const [countdown, setCountdown] = useState<number | null>(null);

  const { connected, operatorStatuses, lastMessage } = useSocket({
    showId,
    onLiveState: (next) => setState(next),
  });

  // Load the initial state.
  useEffect(() => {
    api
      .liveState(showId)
      .then(setState)
      .catch(() => undefined);
  }, [showId]);

  const list = cues.data ?? [];
  const currentCue = useMemo(
    () => list.find((cue) => cue.id === state?.currentCueId) ?? null,
    [list, state?.currentCueId],
  );
  const nextCue = useMemo(
    () => list.find((cue) => cue.id === state?.nextCueId) ?? null,
    [list, state?.nextCueId],
  );

  /* --------------------------- Actions ---------------------------- */

  const applyState = useCallback((next: LiveState) => setState(next), []);

  const goNext = useCallback(async () => {
    try {
      applyState(await api.nextCue(showId));
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Mislukt');
    }
  }, [showId, applyState]);

  const goPrevious = useCallback(async () => {
    try {
      applyState(await api.previousCue(showId));
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Mislukt');
    }
  }, [showId, applyState]);

  const goToCue = useCallback(
    async (cueId: string) => {
      try {
        applyState(await api.setCue(showId, cueId));
      } catch (error) {
        setToast(error instanceof Error ? error.message : 'Mislukt');
      }
    },
    [showId, applyState],
  );

  const skipCue = useCallback(async () => {
    try {
      applyState(await api.skipCue(showId));
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Mislukt');
    }
  }, [showId, applyState]);

  const toggleRehearsal = useCallback(async () => {
    try {
      applyState(await api.setRehearsal(showId, !state?.rehearsal));
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Mislukt');
    }
  }, [showId, state?.rehearsal, applyState]);

  const sendEmergency = useCallback(async () => {
    try {
      applyState(await api.setEmergency(showId, emergencyText));
      setEmergencyOpen(false);
      setEmergencyText('');
      setToast('Noodmelding verstuurd naar alle cameramensen');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Mislukt');
    }
  }, [showId, emergencyText, applyState]);

  const clearEmergency = useCallback(async () => {
    try {
      applyState(await api.setEmergency(showId, ''));
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Mislukt');
    }
  }, [showId, applyState]);

  const sendDirect = useCallback(async () => {
    if (!directTarget || !directText.trim()) return;
    try {
      applyState(await api.sendDirectMessage(showId, directTarget, directText));
      setDirectOpen(false);
      setDirectText('');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Mislukt');
    }
  }, [showId, directTarget, directText, applyState]);

  const createAdHoc = useCallback(async () => {
    try {
      applyState(
        await api.addAdHocCue(showId, {
          name: adhoc.name || 'Extra cue',
          description: adhoc.description,
          notes: adhoc.notes,
        }),
      );
      await cues.reload();
      setAdhocOpen(false);
      setAdhoc({ name: '', description: '', notes: '' });
      setToast('Extra cue ingevoegd en live gezet');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Mislukt');
    }
  }, [showId, adhoc, applyState, cues]);

  /* ----------------------- Keyboard shortcuts --------------------- */

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === ' ' || event.key === 'ArrowRight') {
        event.preventDefault();
        void goNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        void goPrevious();
      } else if (event.key.toLowerCase() === 'e') {
        event.preventDefault();
        setEmergencyOpen(true);
      } else if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        void skipCue();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrevious, skipCue]);

  /* ------------------------ Countdown ---------------------------- */

  useEffect(() => {
    if (!nextCue || !state?.currentCueId) {
      setCountdown(null);
      return;
    }
    const seconds = show.data?.settings.countdownSeconds ?? 5;
    if (seconds <= 0) {
      setCountdown(null);
      return;
    }
    setCountdown(seconds);
    const timer = window.setInterval(() => {
      setCountdown((value) => {
        if (value === null || value <= 1) {
          window.clearInterval(timer);
          return null;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [nextCue?.id, state?.currentCueId, state?.updatedAt, show.data?.settings.countdownSeconds]);

  if (show.loading || !show.data) {
    return (
      <div className="p-6">
        <Loading label="Live regie laden..." />
      </div>
    );
  }

  const showData = show.data;
  const camerasList = cameras.data ?? [];
  const crewList = crew.data ?? [];
  const showCrew = crewList.filter((member) => member.cameraId);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-base-700 bg-base-900 shrink-0">
        <Link
          to={`/shows/${showId}`}
          className="inline-flex items-center gap-1.5 text-xs text-base-400 hover:text-base-200"
        >
          <ArrowLeft size={14} />
          Show
        </Link>

        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{showData.name}</p>
          <p className="text-[11px] text-base-500">
            {list.length} cues
            {state?.rehearsal ? ' · Oefenmodus' : ''}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span
            className={clsx(
              'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md',
              connected ? 'text-go-400 bg-go-500/10' : 'text-live-400 bg-live-500/10',
            )}
          >
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            {connected ? 'Live' : 'Verbinding weg'}
          </span>

          {state?.rehearsal ? (
            <Badge tone="signal">
              <Pause size={11} /> Oefenmodus
            </Badge>
          ) : (
            <Badge tone="live">
              <span className="pulse-dot" /> ON AIR
            </Badge>
          )}

          <Button
            size="sm"
            variant={state?.rehearsal ? 'primary' : 'secondary'}
            onClick={() => void toggleRehearsal()}
            title="Wissel tussen live en oefenmodus"
          >
            {state?.rehearsal ? <Play size={14} /> : <Pause size={14} />}
            {state?.rehearsal ? 'Live' : 'Oefenen'}
          </Button>

          <Button size="sm" variant="secondary" onClick={() => setDirectOpen(true)}>
            <MessageSquare size={14} />
            <span className="hidden sm:inline">Bericht</span>
          </Button>

          <Button size="sm" variant="danger" onClick={() => setEmergencyOpen(true)} title="Noodmelding (E)">
            <Zap size={14} />
            <span className="hidden sm:inline">Nood</span>
          </Button>
        </div>
      </div>

      {/* Emergency banner */}
      {state?.emergency ? (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-live-500/20 border-b border-live-500/50 shrink-0">
          <AlertTriangle size={18} className="text-live-400 shrink-0 animate-pulse" />
          <p className="text-sm font-semibold text-live-400 flex-1">{state.emergency}</p>
          <Button size="sm" variant="secondary" onClick={() => void clearEmergency()}>
            wissen
          </Button>
        </div>
      ) : null}

      {lastMessage && lastMessage.kind !== 'emergency' ? (
        <div className="px-4 py-1.5 bg-accent-500/10 border-b border-accent-500/30 text-xs text-accent-300 shrink-0">
          <span className="font-semibold">{lastMessage.fromName}:</span> {lastMessage.text}
        </div>
      ) : null}

      {/* Main */}
      <div className="flex-1 min-h-0 grid lg:grid-cols-[1fr_380px] overflow-hidden">
        {/* Left: current + next cue + stage */}
        <div className="flex flex-col min-h-0 overflow-y-auto">
          {/* Current cue */}
          <div className="p-4 sm:p-5 border-b border-base-700">
            <div className="flex items-center gap-3 mb-3">
              <span className="kicker">Huidige cue</span>
              {countdown !== null ? (
                <span className="text-xs font-semibold text-signal-300">
                  volgende cue over {countdown}s
                </span>
              ) : null}
            </div>

            {currentCue ? (
              <div>
                <div className="flex items-start gap-4">
                  <span className="grid place-items-center w-16 h-16 rounded-xl bg-accent-500 text-white text-3xl font-bold tabular shrink-0">
                    {currentCue.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-semibold truncate">{currentCue.name}</h2>
                    {currentCue.description ? (
                      <p className="text-sm text-base-300 mt-1 leading-relaxed">
                        {currentCue.description}
                      </p>
                    ) : null}
                    <div className="flex items-center gap-3 mt-2 text-xs text-base-400">
                      <span className="tabular">
                        {formatTimecode(currentCue.startSeconds, showData.settings.timecodeFormat)}
                      </span>
                      {currentCue.notes ? (
                        <span className="text-signal-300">Notitie aanwezig</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {currentCue.notes ? (
                  <div className="mt-3 px-3 py-2 rounded-lg bg-signal-500/10 border border-signal-500/30 text-sm text-signal-300">
                    {currentCue.notes}
                  </div>
                ) : null}

                {/* Camera assignments */}
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {camerasList.map((camera) => {
                    const assignment = currentCue.shots?.[camera.id];
                    const operator = showCrew.find((member) => member.cameraId === camera.id);
                    const status = operatorStatuses.find((s) => s.crewId === operator?.id);
                    return (
                      <div
                        key={camera.id}
                        className={clsx(
                          'rounded-lg border px-3 py-2',
                          assignment ? 'bg-base-800 border-base-600' : 'bg-base-850 border-base-700 opacity-60',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="grid place-items-center w-6 h-6 rounded text-[11px] font-bold shrink-0"
                            style={{ backgroundColor: `${camera.color}22`, color: camera.color }}
                          >
                            {camera.number}
                          </span>
                          <span className="text-xs font-medium truncate flex-1">{camera.name}</span>
                          {status ? (
                            <span
                              className={clsx(
                                'w-1.5 h-1.5 rounded-full shrink-0',
                                status.connected ? 'bg-go-500' : 'bg-base-500',
                              )}
                              title={status.connected ? 'Verbonden' : 'Offline'}
                            />
                          ) : null}
                        </div>
                        {assignment ? (
                          <p className="text-sm font-semibold text-accent-300 mt-1.5 truncate">
                            {assignment.shot || 'Zonder shot'}
                          </p>
                        ) : (
                          <p className="text-xs text-base-500 mt-1.5">Geen opdracht</p>
                        )}
                        {assignment?.subject ? (
                          <p className="text-xs text-base-300 truncate">Volg: {assignment.subject}</p>
                        ) : null}
                        {assignment?.movement ? (
                          <p className="text-xs text-base-400 truncate">→ {assignment.movement}</p>
                        ) : null}
                        {assignment?.notes ? (
                          <p className="text-xs text-signal-300 truncate mt-0.5">{assignment.notes}</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<Radio size={28} />}
                title="Geen actieve cue"
                description="Start met de volgende cue wanneer de voorstelling begint."
                action={
                  <Button variant="primary" onClick={() => void goNext()}>
                    <ChevronRight size={16} /> Naar de eerste cue
                  </Button>
                }
              />
            )}
          </div>

          {/* Stage */}
          <div className="p-4 sm:p-5 flex-1 min-h-0">
            <p className="kicker mb-3">Podiumindeling</p>
            {stage.data ? (
              <LiveStageView stage={stage.data} cue={currentCue} height={280} />
            ) : (
              <EmptyState
                icon={<Camera size={26} />}
                title="Geen podium gekoppeld"
                description="Koppel een podium aan deze show om de indeling te tonen."
              />
            )}
          </div>
        </div>

        {/* Right: controls + cue list + crew */}
        <aside className="border-l border-base-700 bg-base-900 flex flex-col min-h-0">
          {/* Transport */}
          <div className="p-4 border-b border-base-700 shrink-0">
            <Button
              variant="primary"
              size="lg"
              className="w-full py-4 text-lg font-bold"
              onClick={() => void goNext()}
            >
              <ChevronRight size={22} />
              VOLGENDE CUE
            </Button>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Button size="sm" variant="secondary" onClick={() => void goPrevious()} title="Vorige cue (←)">
                <ChevronLeft size={15} />
                Vorige
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void skipCue()} title="Cue overslaan (S)">
                <SkipForward size={15} />
                Sla over
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setAdhocOpen(true)} title="Extra cue">
                <Plus size={15} />
                Extra
              </Button>
            </div>
          </div>

          {/* Next cue */}
          <div className="p-4 border-b border-base-700 shrink-0">
            <p className="kicker mb-2">Volgende cue</p>
            {nextCue ? (
              <button
                type="button"
                onClick={() => void goToCue(nextCue.id)}
                className="w-full text-left rounded-lg border border-signal-500/40 bg-signal-500/10 px-3 py-2.5 hover:bg-signal-500/15 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="grid place-items-center w-8 h-8 rounded-md bg-signal-500/20 text-signal-300 text-sm font-bold tabular">
                    {nextCue.number}
                  </span>
                  <span className="text-sm font-semibold truncate flex-1">{nextCue.name}</span>
                  <ChevronRight size={15} className="text-signal-400 shrink-0" />
                </div>
                {nextCue.description ? (
                  <p className="text-xs text-base-300 mt-1.5 line-clamp-2">{nextCue.description}</p>
                ) : null}
              </button>
            ) : (
              <p className="text-xs text-base-500">Dit is de laatste cue.</p>
            )}
          </div>

          {/* Cue list */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            <p className="kicker mb-2">Alle cues</p>
            <ul className="space-y-1">
              {list.map((cue) => {
                const isCurrent = cue.id === state?.currentCueId;
                const isNext = cue.id === state?.nextCueId;
                return (
                  <li key={cue.id}>
                    <button
                      type="button"
                      onClick={() => void goToCue(cue.id)}
                      className={clsx(
                        'w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition-colors border',
                        isCurrent
                          ? 'bg-accent-500/15 border-accent-500/50'
                          : isNext
                            ? 'bg-signal-500/10 border-signal-500/40'
                            : 'bg-base-850 border-transparent hover:bg-base-800',
                      )}
                    >
                      <span className="tabular text-xs font-semibold text-base-400 w-5 shrink-0">
                        {cue.number}
                      </span>
                      <span className="text-sm truncate flex-1">{cue.name}</span>
                      {isCurrent ? (
                        <span className="pulse-dot shrink-0" />
                      ) : isNext ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-signal-500 shrink-0" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Crew status */}
          <div className="border-t border-base-700 p-3 shrink-0 max-h-56 overflow-y-auto">
            <p className="kicker mb-2 flex items-center gap-2">
              <Users size={12} /> Crew status
            </p>
            <ul className="space-y-1">
              {showCrew.map((member) => {
                const camera = camerasList.find((c) => c.id === member.cameraId);
                const status = operatorStatuses.find((s) => s.crewId === member.id);
                const assignment = currentCue?.shots?.[camera?.id ?? ''];
                return (
                  <li
                    key={member.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-base-850 text-xs"
                  >
                    <span
                      className={clsx(
                        'w-2 h-2 rounded-full shrink-0',
                        status?.connected ? 'bg-go-500' : 'bg-base-600',
                      )}
                      title={status?.connected ? 'Verbonden' : 'Offline'}
                    />
                    <span className="font-medium truncate">{member.name}</span>
                    {camera ? (
                      <span
                        className="px-1.5 rounded text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: `${camera.color}22`, color: camera.color }}
                      >
                        {camera.number}
                      </span>
                    ) : null}
                    <span className="ml-auto text-[10px] text-base-400 truncate max-w-[45%]">
                      {status?.receivedAt
                        ? `Cue ${currentCue?.number ?? '?'} · ${formatRelative(status.receivedAt)}`
                        : assignment?.shot ?? ''}
                    </span>
                  </li>
                );
              })}
              {showCrew.length === 0 ? (
                <li className="text-xs text-base-500 px-2.5 py-2">
                  Geen crew gekoppeld aan deze show.
                </li>
              ) : null}
            </ul>
          </div>
        </aside>
      </div>

      {/* Emergency modal */}
      <Modal
        open={emergencyOpen}
        title="Noodmelding"
        onClose={() => setEmergencyOpen(false)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEmergencyOpen(false)}>
              Annuleren
            </Button>
            <Button variant="danger" onClick={() => void sendEmergency()}>
              <Zap size={14} />
              Verstuur naar alle cameramensen
            </Button>
          </>
        }
      >
        <Field
          label="Instructie"
          hint="Dit bericht verschijnt direct en opvallend op alle iPads."
        >
          <textarea
            className="input"
            rows={3}
            value={emergencyText}
            onChange={(event) => setEmergencyText(event.target.value)}
            placeholder="Bijv. Stop met filmen, de regie komt naar jullie toe."
            autoFocus
          />
        </Field>
      </Modal>

      {/* Direct message modal */}
      <Modal
        open={directOpen}
        title="Bericht naar cameraman"
        onClose={() => setDirectOpen(false)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDirectOpen(false)}>
              Annuleren
            </Button>
            <Button variant="primary" onClick={() => void sendDirect()} disabled={!directTarget || !directText.trim()}>
              Verstuur
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Ontvanger">
            <select
              className="input"
              value={directTarget}
              onChange={(event) => setDirectTarget(event.target.value)}
            >
              <option value="">— Kies een cameraman —</option>
              {showCrew.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Bericht">
            <textarea
              className="input"
              rows={3}
              value={directText}
              onChange={(event) => setDirectText(event.target.value)}
              placeholder="Bijv. Even wachten met de wide shot."
              autoFocus
            />
          </Field>
        </div>
      </Modal>

      {/* Ad-hoc cue modal */}
      <Modal
        open={adhocOpen}
        title="Onverwachte cue invoegen"
        onClose={() => setAdhocOpen(false)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdhocOpen(false)}>
              Annuleren
            </Button>
            <Button variant="primary" onClick={() => void createAdHoc()}>
              Invoegen en live zetten
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Naam">
            <input
              className="input"
              value={adhoc.name}
              onChange={(event) => setAdhoc({ ...adhoc, name: event.target.value })}
              placeholder="Bijv. Extra nummer"
              autoFocus
            />
          </Field>
          <Field label="Beschrijving">
            <textarea
              className="input"
              rows={2}
              value={adhoc.description}
              onChange={(event) => setAdhoc({ ...adhoc, description: event.target.value })}
            />
          </Field>
          <Field label="Notitie">
            <input
              className="input"
              value={adhoc.notes}
              onChange={(event) => setAdhoc({ ...adhoc, notes: event.target.value })}
            />
          </Field>
        </div>
      </Modal>

      {toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
