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
  MessageSquare,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '../lib/api';
import { useAsync, useAsyncWhen, useLocalStorage } from '../hooks/useApi';
import { useSocket } from '../hooks/useSocket';
import { Button, Field, Toast } from '../components/ui';
import { OperatorStage } from '../components/OperatorStage';
import { STATUS_COLORS } from '../lib/stagePalette';
import { shotLabel } from '../lib/shotCodes';
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
      // The camera is linked to a show through its crew member. When the
      // operator opened the screen without a show in the url, the claim
      // response tells us which show to subscribe to.
      const claimedShowId = routeShowId ?? result.show?.id ?? activeShowId;
      const next: DeviceIdentity = {
        crewId: result.crew?.id ?? null,
        cameraId: result.camera.id,
        showId: claimedShowId,
      };
      setIdentity(next);
      setDeviceShowId(claimedShowId);
      setClaimCode('');
      setToast(
        result.show
          ? `Gekoppeld aan ${result.camera.name} — ${result.show.name}`
          : `Gekoppeld aan ${result.camera.name}`,
      );
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Koppelen mislukt');
    } finally {
      setClaimBusy(false);
    }
  }, [claimCode, routeShowId, activeShowId, setIdentity]);

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

  /*
    The handbook teaches the operators to read their tablet by the colour of
    the border:
      red    = you are live, hold your shot still
      green  = you are next, prepare your shot
      grey   = stand-by, you may move and search
  */
  const status: 'live' | 'next' | 'standby' = state?.emergency
    ? 'live'
    : assignment
      ? 'live'
      : nextAssignment
        ? 'next'
        : 'standby';

  const statusLabel =
    status === 'live' ? 'LIVE' : status === 'next' ? 'STRAKS LIVE' : 'STAND-BY';

  const borderColor =
    status === 'live'
      ? STATUS_COLORS.live
      : status === 'next'
        ? STATUS_COLORS.next
        : STATUS_COLORS.standby;

  const shot = shotLabel(assignment?.shot);
  const nextShot = shotLabel(nextAssignment?.shot);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* The tablet: a black screen with a thick coloured border. */}
      <div
        className="flex-1 min-h-0 flex flex-col m-0 sm:m-2 lg:m-3 rounded-xl overflow-hidden"
        style={{ border: `10px solid ${borderColor}` }}
      >
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 bg-black shrink-0">
          <span
            className="grid place-items-center w-11 h-11 rounded-xl text-xl font-bold shrink-0"
            style={{
              backgroundColor: camera ? `${camera.color}33` : '#1b2430',
              color: camera?.color ?? '#7a8794',
            }}
          >
            {camera?.number ?? '?'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{camera?.name ?? 'Camera'}</p>
            <p className="text-xs text-[#7a8794] truncate">
              {member?.name ?? 'Cameraman'}
              {show.data ? ` · ${show.data.name}` : ''}
            </p>
          </div>
          <span
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md shrink-0 uppercase tracking-wider"
            style={{ backgroundColor: `${borderColor}22`, color: borderColor }}
          >
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span className="hidden sm:inline">{connected ? statusLabel : 'Offline'}</span>
          </span>
          <Button size="sm" variant="ghost" onClick={disconnect} title="Uitloggen" className="text-[#7a8794] hover:text-white">
            <LogOut size={16} />
          </Button>
        </header>

        {/* Emergency banner */}
        {state?.emergency ? (
          <div
            className="flex items-center gap-3 px-4 py-4 shrink-0"
            style={{ backgroundColor: `${STATUS_COLORS.live}22`, borderBottom: `2px solid ${STATUS_COLORS.live}` }}
          >
            <AlertTriangle size={26} className="shrink-0 animate-pulse" style={{ color: STATUS_COLORS.live }} />
            <p className="text-lg font-bold leading-tight" style={{ color: STATUS_COLORS.live }}>
              {state.emergency}
            </p>
          </div>
        ) : null}

        {/* Direct message */}
        {directMessage ? (
          <div
            className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ backgroundColor: 'rgba(76,141,255,0.16)', borderBottom: '1px solid #4c8dff' }}
          >
            <MessageSquare size={20} className="shrink-0" style={{ color: '#7fb0ff' }} />
            <p className="text-base font-medium" style={{ color: '#c6ddff' }}>
              {directMessage}
            </p>
          </div>
        ) : null}

        {/* Last general message */}
        {lastMessage && lastMessage.kind !== 'emergency' && !directMessage ? (
          <div className="px-4 py-2 bg-black text-sm shrink-0" style={{ borderBottom: '1px solid #1b2430' }}>
            <span className="font-semibold text-white">{lastMessage.fromName}:</span>{' '}
            <span className="text-[#b6c0cf]">{lastMessage.text}</span>
          </div>
        ) : null}

        {/* Main */}
        <main className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* The shot, in the middle of the screen. */}
          <section className="flex-1 min-h-0 flex flex-col p-4 sm:p-5 lg:p-6">
            {/* The scene, at the top. */}
            <p className="text-center text-white/60 text-sm uppercase tracking-[0.2em] shrink-0">
              {currentCue?.name ?? 'Geen actieve scene'}
            </p>

            {currentCue ? (
              <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-4 text-center">
                {/* The shot code, big in the middle. A dash means "vrij". */}
                <p
                  className="font-bold leading-none tracking-tight"
                  style={{ color: borderColor, fontSize: 'clamp(4rem, 18vw, 11rem)' }}
                >
                  {shot.code || '—'}
                </p>
                <p className="mt-2 text-white font-semibold text-xl sm:text-3xl">
                  {assignment ? shot.name || 'Geen shot' : 'Vrij'}
                </p>
                {assignment?.subject ? (
                  <p className="mt-1 text-[#b6c0cf] text-lg sm:text-2xl">
                    {assignment.subject}
                  </p>
                ) : null}

                {assignment?.movement ? (
                  <p className="mt-3 text-sm text-[#7a8794]">
                    {assignment.movement}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <p className="text-2xl font-semibold text-white">
                  {show.data?.settings.standbyMessage ?? 'Wachten op regie...'}
                </p>
                <p className="text-base text-[#7a8794] mt-2">
                  De volgende cue verschijnt hier automatisch zodra de regie hem activeert.
                </p>
              </div>
            )}

            {assignment?.notes ? (
              <p className="text-center text-white text-base mb-3">{assignment.notes}</p>
            ) : null}

            {currentCue?.notes ? (
              <p className="text-center text-sm text-[#e8b054] mb-3">{currentCue.notes}</p>
            ) : null}

            {show.data?.settings.operatorsCanAcknowledge ? (
              <Button
                variant="ghost"
                size="lg"
                className="w-full py-4 text-lg shrink-0"
                style={{
                  border: `2px solid ${borderColor}`,
                  color: borderColor,
                  backgroundColor: 'transparent',
                }}
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
          </section>

          {/* Right column: stage plan + next shot */}
          <aside className="lg:w-[420px] xl:w-[480px] border-t lg:border-t-0 lg:border-l border-[#1b2430] bg-black p-4 sm:p-5 flex flex-col gap-4 shrink-0">
            {stage.data ? (
              <div>
                <p className="text-[#7a8794] text-xs uppercase tracking-[0.15em] mb-2">
                  Waar je moet filmen
                </p>
                <OperatorStage
                  stage={stage.data}
                  cue={currentCue}
                  camera={camera}
                  height={240}
                />
              </div>
            ) : null}

            {/* The next shot, at the bottom. */}
            {nextCue ? (
              <div className="rounded-xl p-4" style={{ border: `1px solid ${STATUS_COLORS.next}66` }}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-xs uppercase tracking-[0.15em] font-bold"
                    style={{ color: STATUS_COLORS.next }}
                  >
                    Volgende shot
                  </span>
                  <ChevronRight size={14} style={{ color: STATUS_COLORS.next }} />
                  <span className="tabular text-sm font-bold" style={{ color: STATUS_COLORS.next }}>
                    {nextCue.number}
                  </span>
                </div>
                {nextAssignment ? (
                  <div className="flex items-center gap-3">
                    <span
                      className="font-bold leading-none"
                      style={{ color: STATUS_COLORS.next, fontSize: '2.5rem' }}
                    >
                      {nextShot.code || '—'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-white font-semibold truncate">{nextShot.name || 'Geen shot'}</p>
                      {nextAssignment.subject ? (
                        <p className="text-sm text-[#b6c0cf] truncate">{nextAssignment.subject}</p>
                      ) : null}
                      {nextAssignment.movement ? (
                        <p className="text-sm text-[#7a8794] truncate">{nextAssignment.movement}</p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[#7a8794]">Geen shot gepland voor deze camera.</p>
                )}
              </div>
            ) : (
              <div className="rounded-xl p-4" style={{ border: '1px solid #1b2430' }}>
                <p className="text-xs uppercase tracking-[0.15em] font-bold text-[#7a8794]">
                  Volgende shot
                </p>
                <p className="text-sm text-[#7a8794] mt-1">Dit is de laatste cue van de show.</p>
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
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span
            className="inline-grid place-items-center w-16 h-16 rounded-2xl text-3xl font-bold mb-4"
            style={{ backgroundColor: '#e03131', color: '#ffffff' }}
          >
            F
          </span>
          <h1 className="text-2xl font-semibold text-white">FEY Camera Operator</h1>
          <p className="text-sm text-[#7a8794] mt-1">
            {show ? show.name : 'Koppel je aan je camera om opdrachten te ontvangen'}
          </p>
        </div>

        <div
          className="rounded-xl p-6"
          style={{ border: '2px solid #1b2430', backgroundColor: '#0b0e13' }}
        >
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
              connected ? 'text-go-700' : 'text-live-500',
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
