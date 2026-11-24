import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronRight,
  LogOut,
  KeyRound,
  AlertTriangle,
  Check,
  Wifi,
  WifiOff,
  Target,
  MoveRight,
  MessageSquare,
  RotateCw,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '../lib/api';
import { useAsync, useAsyncWhen, useLocalStorage } from '../hooks/useApi';
import { useSocket } from '../hooks/useSocket';
import { formatTimecode } from '../lib/utils';
import { Badge, Button, Field, Toast } from '../components/ui';
import { OperatorStage } from '../components/OperatorStage';
import type { Camera as CameraModel, CrewMember, Cue, LiveState, Show, Stage } from '../types';

interface DeviceIdentity {
  crewId: string | null;
  cameraId: string | null;
  showId: string | null;
}

export function OperatorPage() {
  const { showId: routeShowId } = useParams();
  const navigate = useNavigate();

  const [identity, setIdentity] = useLocalStorage<DeviceIdentity>('fey.device', {
    crewId: null,
    cameraId: null,
    showId: null,
  });
  const [deviceShowId, setDeviceShowId] = useState<string | null>(routeShowId ?? null);
  const [state, setState] = useState<LiveState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [claimCode, setClaimCode] = useState('');
  const [claimBusy, setClaimBusy] = useState(false);
  const [acked, setAcked] = useState(false);

  const activeShowId = routeShowId ?? deviceShowId ?? identity.showId;

  const show = useAsyncShow(activeShowId);
  const cameras = useAsyncCameras();
  const crew = useAsyncCrew();
  const cues = useAsyncCues(activeShowId);
  const stage = useAsyncWhen<Stage | null>(
    async () => {
      const stageId = show.data?.stageId;
      if (!stageId) return null;
      return api.stage(stageId);
    },
    Boolean(show.data?.stageId),
    [show.data?.stageId],
  );

  const { connected, liveState, lastMessage, acknowledge } = useSocket({
    showId: activeShowId,
    crewId: identity.crewId,
    cameraId: identity.cameraId,
    onLiveState: (next) => setState(next),
  });

  // Adopt the socket state if the REST call has not landed yet.
  useEffect(() => {
    if (liveState) setState(liveState);
  }, [liveState]);

  // Load the current live state once, so the operator immediately sees the
  // active cue when opening the screen (the socket only pushes changes).
  useEffect(() => {
    if (!activeShowId) return;
    let cancelled = false;
    api
      .liveState(activeShowId)
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activeShowId]);

  const camera = useMemo(
    () => cameras.data?.find((c) => c.id === identity.cameraId) ?? null,
    [cameras.data, identity.cameraId],
  );
  const member = useMemo(
    () => crew.data?.find((c) => c.id === identity.crewId) ?? null,
    [crew.data, identity.crewId],
  );

  const cueList = cues.data ?? [];
  const currentCue = useMemo(
    () => cueList.find((cue) => cue.id === state?.currentCueId) ?? null,
    [cueList, state?.currentCueId],
  );
  const nextCue = useMemo(
    () => cueList.find((cue) => cue.id === state?.nextCueId) ?? null,
    [cueList, state?.nextCueId],
  );

  const assignment = useMemo(() => {
    if (!currentCue || !camera) return null;
    return currentCue.shots?.[camera.id] ?? null;
  }, [currentCue, camera]);

  const nextAssignment = useMemo(() => {
    if (!nextCue || !camera) return null;
    return nextCue.shots?.[camera.id] ?? null;
  }, [nextCue, camera]);

  const directMessage = identity.crewId ? state?.directMessages?.[identity.crewId] : null;

  // Acknowledge the cue as received.
  useEffect(() => {
    if (!currentCue || !identity.crewId || !camera) return;
    if (acked) return;
    acknowledge(currentCue.id);
    setAcked(true);
  }, [currentCue, identity.crewId, camera, acknowledge, acked]);

  useEffect(() => {
    setAcked(false);
  }, [currentCue?.id]);

  const handleClaim = useCallback(async () => {
    if (!claimCode.trim()) return;
    setClaimBusy(true);
    try {
      const result = await api.claimCamera(claimCode.trim());
      const next: DeviceIdentity = {
        crewId: result.crew?.id ?? null,
        cameraId: result.camera.id,
        showId: activeShowId,
      };
      setIdentity(next);
      setDeviceShowId(activeShowId);
      setClaimCode('');
      setToast(`Gekoppeld aan ${result.camera.name}`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Koppelen mislukt');
    } finally {
      setClaimBusy(false);
    }
  }, [claimCode, activeShowId, setIdentity]);

  function disconnect() {
    setIdentity({ crewId: null, cameraId: null, showId: null });
    setDeviceShowId(null);
    navigate('/operator');
  }

  /* -------------------------- Claim screen ------------------------- */

  if (!identity.cameraId) {
    return (
      <ClaimScreen
        show={show.data}
        code={claimCode}
        setCode={setClaimCode}
        busy={claimBusy}
        onClaim={handleClaim}
        connected={connected}
        onToast={setToast}
        toast={toast}
      />
    );
  }

  /* ------------------------- Operator screen ------------------------ */

  const status: 'active' | 'next' | 'warning' | 'idle' = state?.emergency
    ? 'warning'
    : assignment
      ? 'active'
      : 'idle';

  return (
    <div className="min-h-screen bg-base-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-base-700 bg-base-900 shrink-0">
        <span
          className="grid place-items-center w-11 h-11 rounded-xl text-xl font-bold shrink-0"
          style={{
            backgroundColor: camera ? `${camera.color}22` : '#1e293b',
            color: camera?.color ?? '#8593a8',
          }}
        >
          {camera?.number ?? '?'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{camera?.name ?? 'Camera'}</p>
          <p className="text-xs text-base-400 truncate">
            {member?.name ?? 'Cameraman'}
            {show.data ? ` · ${show.data.name}` : ''}
          </p>
        </div>
        <span
          className={clsx(
            'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md shrink-0',
            connected ? 'text-go-400 bg-go-500/10' : 'text-live-400 bg-live-500/10',
          )}
        >
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span className="hidden sm:inline">{connected ? 'Live' : 'Offline'}</span>
        </span>
        <Button size="sm" variant="ghost" onClick={disconnect} title="Uitloggen">
          <LogOut size={16} />
        </Button>
      </header>

      {/* Emergency banner */}
      {state?.emergency ? (
        <div className="flex items-center gap-3 px-4 py-4 bg-live-500/25 border-b-2 border-live-500 shrink-0">
          <AlertTriangle size={26} className="text-live-400 shrink-0 animate-pulse" />
          <p className="text-lg font-bold text-live-400 leading-tight">{state.emergency}</p>
        </div>
      ) : null}

      {/* Direct message */}
      {directMessage ? (
        <div className="flex items-center gap-3 px-4 py-3 bg-accent-500/15 border-b border-accent-500/40 shrink-0">
          <MessageSquare size={20} className="text-accent-300 shrink-0" />
          <p className="text-base font-medium text-accent-300">{directMessage}</p>
        </div>
      ) : null}

      {/* Last general message */}
      {lastMessage && lastMessage.kind !== 'emergency' && !directMessage ? (
        <div className="px-4 py-2 bg-base-800 border-b border-base-700 text-sm text-base-200 shrink-0">
          <span className="font-semibold text-base-300">{lastMessage.fromName}:</span> {lastMessage.text}
        </div>
      ) : null}

      {/* Main */}
      <main className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Current assignment */}
        <section className="flex-1 min-h-0 flex flex-col p-4 sm:p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="kicker">Huidige opdracht</span>
            {state?.rehearsal ? <Badge tone="signal">Oefenmodus</Badge> : null}
          </div>

          {currentCue ? (
            <div
              className={clsx(
                'rounded-2xl border-2 p-5 sm:p-6 flex-1 min-h-0 flex flex-col',
                status === 'warning'
                  ? 'status-warning'
                  : status === 'active'
                    ? 'status-active'
                    : 'status-idle',
              )}
            >
              <div className="flex items-start gap-4 sm:gap-6">
                <span
                  className={clsx(
                    'grid place-items-center rounded-2xl font-bold tabular shrink-0',
                    status === 'active'
                      ? 'w-20 h-20 sm:w-24 sm:h-24 text-4xl sm:text-5xl bg-go-500 text-black'
                      : status === 'warning'
                        ? 'w-20 h-20 sm:w-24 sm:h-24 text-4xl sm:text-5xl bg-live-500 text-white'
                        : 'w-20 h-20 sm:w-24 sm:h-24 text-4xl sm:text-5xl bg-base-700 text-base-300',
                  )}
                >
                  {currentCue.number}
                </span>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl sm:text-4xl font-bold leading-tight truncate">
                    {currentCue.name}
                  </h1>
                  {currentCue.description ? (
                    <p className="text-base sm:text-xl text-base-200 mt-2 leading-snug">
                      {currentCue.description}
                    </p>
                  ) : null}
                </div>
              </div>

              {assignment ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <InstructionBlock
                    icon={<Target size={20} />}
                    label="Shot"
                    value={assignment.shot || '—'}
                    tone="go"
                  />
                  <InstructionBlock
                    icon={<Target size={20} />}
                    label="Volg"
                    value={assignment.subject || '—'}
                  />
                  <InstructionBlock
                    icon={<MoveRight size={20} />}
                    label="Beweging"
                    value={assignment.movement || 'Geen beweging'}
                  />
                  <InstructionBlock
                    icon={<RotateCw size={20} />}
                    label="Tijdcode"
                    value={formatTimecode(currentCue.startSeconds, show.data?.settings.timecodeFormat ?? 'mm:ss')}
                  />
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-base-600 bg-base-850 p-5 text-center">
                  <p className="text-lg font-semibold text-base-300">
                    Geen opdracht voor deze camera
                  </p>
                  <p className="text-sm text-base-400 mt-1">
                    Wacht op de regie voor een nieuwe cue.
                  </p>
                </div>
              )}

              {assignment?.notes ? (
                <p className="mt-3 rounded-xl bg-base-800 border border-base-600 px-4 py-3 text-base text-base-200">
                  {assignment.notes}
                </p>
              ) : null}

              {currentCue.notes ? (
                <div className="mt-3 rounded-xl bg-signal-500/10 border border-signal-500/40 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-signal-300 mb-1">
                    Notitie van de regie
                  </p>
                  <p className="text-base text-signal-200 leading-snug">{currentCue.notes}</p>
                </div>
              ) : null}

              {currentCue.shotReferenceUrl ? (
                <img
                  src={currentCue.shotReferenceUrl}
                  alt="Shotreferentie"
                  className="mt-4 rounded-xl border border-base-700 max-h-56 object-contain bg-base-900"
                />
              ) : null}

              {show.data?.settings.operatorsCanAcknowledge ? (
                <Button
                  variant={acked ? 'secondary' : 'primary'}
                  size="lg"
                  className="mt-5 w-full py-4 text-lg"
                  onClick={() => {
                    if (!currentCue || !camera) return;
                    acknowledge(currentCue.id);
                    setAcked(true);
                  }}
                  disabled={acked}
                >
                  {acked ? (
                    <>
                      <Check size={20} /> Opdracht ontvangen
                    </>
                  ) : (
                    'Bevestig dat je de opdracht hebt ontvangen'
                  )}
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-base-700 bg-base-850 p-8 text-center flex-1 flex flex-col items-center justify-center">
              <p className="text-2xl font-semibold text-base-300">
                {show.data?.settings.standbyMessage ?? 'Wachten op regie...'}
              </p>
              <p className="text-base text-base-400 mt-2">
                De volgende cue verschijnt hier automatisch zodra de regie hem activeert.
              </p>
            </div>
          )}
        </section>

        {/* Right column: stage + next cue */}
        <aside className="lg:w-[420px] xl:w-[480px] border-t lg:border-t-0 lg:border-l border-base-700 bg-base-900 p-4 sm:p-5 flex flex-col gap-4 shrink-0">
          {stage.data ? (
            <div>
              <p className="kicker mb-2">Podium</p>
              <OperatorStage
                stage={stage.data}
                cue={currentCue}
                camera={camera}
                height={240}
              />
            </div>
          ) : null}

          {nextCue ? (
            <div className="rounded-xl border border-signal-500/40 bg-signal-500/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="kicker text-signal-300">Volgende opdracht</span>
                <ChevronRight size={14} className="text-signal-400" />
                <span className="tabular text-sm font-bold text-signal-300">{nextCue.number}</span>
              </div>
              <p className="text-lg font-semibold truncate">{nextCue.name}</p>
              {nextAssignment ? (
                <div className="mt-2 space-y-1 text-sm">
                  <p className="text-signal-200">
                    <span className="text-signal-300/70">Shot:</span> {nextAssignment.shot || '—'}
                  </p>
                  {nextAssignment.subject ? (
                    <p className="text-base-300">
                      <span className="text-signal-300/70">Volg:</span> {nextAssignment.subject}
                    </p>
                  ) : null}
                  {nextAssignment.movement ? (
                    <p className="text-base-300">
                      <span className="text-signal-300/70">Beweging:</span> {nextAssignment.movement}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-base-400 mt-1">
                  Geen shot gepland voor deze camera.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-base-700 bg-base-850 p-4">
              <p className="kicker mb-1">Volgende opdracht</p>
              <p className="text-sm text-base-400">Dit is de laatste cue van de show.</p>
            </div>
          )}

          <div className="mt-auto">
            <a
              href={`/api/export/cameras/${identity.cameraId}/pdf${activeShowId ? `?showId=${activeShowId}` : ''}`}
              className="btn btn-secondary btn-sm w-full"
            >
              Mijn shotlist (PDF)
            </a>
          </div>
        </aside>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Instruction block                                                  */
/* ------------------------------------------------------------------ */

function InstructionBlock({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: 'go';
}) {
  return (
    <div
      className={clsx(
        'rounded-xl border px-4 py-3',
        tone === 'go' ? 'border-go-500/50 bg-go-500/10' : 'border-base-600 bg-base-850',
      )}
    >
      <div className="flex items-center gap-2 text-base-400 mb-1">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p
        className={clsx(
          'text-lg sm:text-xl font-semibold leading-tight',
          tone === 'go' ? 'text-go-400' : 'text-base-100',
        )}
      >
        {value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Claim screen                                                       */
/* ------------------------------------------------------------------ */

function ClaimScreen({
  show,
  code,
  setCode,
  busy,
  onClaim,
  connected,
  onToast,
  toast,
}: {
  show: Show | null | undefined;
  code: string;
  setCode: (value: string) => void;
  busy: boolean;
  onClaim: () => void;
  connected: boolean;
  onToast: (message: string) => void;
  toast: string | null;
}) {
  return (
    <div className="min-h-screen bg-base-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="inline-grid place-items-center w-16 h-16 rounded-2xl bg-accent-500 text-white text-3xl font-bold mb-4">
            F
          </span>
          <h1 className="text-2xl font-semibold">FEY Camera Operator</h1>
          <p className="text-sm text-base-400 mt-1">
            {show ? show.name : 'Koppel je aan je camera om opdrachten te ontvangen'}
          </p>
        </div>

        <div className="panel p-6">
          <Field label="Toegangscode" hint="De code staat op je camera of bij de regie.">
            <input
              className="input text-center text-3xl font-mono uppercase tracking-[0.3em] h-16"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 8))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void onClaim();
              }}
              placeholder="••••"
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
            />
          </Field>

          <Button
            variant="primary"
            size="lg"
            className="w-full mt-5 py-4 text-lg"
            onClick={onClaim}
            disabled={busy || code.trim().length < 3}
          >
            <KeyRound size={18} />
            {busy ? 'Koppelen...' : 'Koppel aan camera'}
          </Button>

          <p
            className={clsx(
              'text-xs text-center mt-4 flex items-center justify-center gap-1.5',
              connected ? 'text-go-400' : 'text-live-400',
            )}
          >
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            {connected ? 'Verbonden met de regie' : 'Geen verbinding met de regie'}
          </p>
        </div>

        {toast ? <Toast message={toast} onDismiss={() => onToast('')} /> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small data hooks                                                   */
/* ------------------------------------------------------------------ */

function useAsyncShow(showId: string | null) {
  return useAsync<Show | null>(
    async () => (showId ? api.show(showId) : null),
    [showId],
  );
}

function useAsyncCameras() {
  return useAsync<CameraModel[]>(() => api.cameras(), []);
}

function useAsyncCrew() {
  return useAsync<CrewMember[]>(() => api.crew(), []);
}

function useAsyncCues(showId: string | null) {
  return useAsync<Cue[]>(
    async () => (showId ? api.cues(showId) : []),
    [showId],
  );
}
