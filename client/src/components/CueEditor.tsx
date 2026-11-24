import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ListOrdered,
  Plus,
  Copy,
  Trash2,
  GripVertical,
  Clock,
  Camera,
  Users,
  StickyNote,
  Play,
  Image as ImageIcon,
  ChevronDown,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '../lib/api';
import { useAsync } from '../hooks/useApi';
import { formatDuration, formatTimecode, STANDARD_SHOTS } from '../lib/utils';
import { actorElements, buildCuePositions } from '../lib/stageGeometry';
import { useElementSize } from '../hooks/useElementSize';
import { Badge, Button, EmptyState, Field, Loading, Modal, Panel } from './ui';
import { StageCanvas } from './StageCanvas';
import type { Camera as CameraModel, CrewMember, Cue, Scene, Stage, StageElement } from '../types';

interface CueEditorProps {
  showId: string;
  scenes: Scene[];
  stage: Stage | null;
  cameras: CameraModel[];
  crew: CrewMember[];
  onToast: (message: string) => void;
}

export function CueEditor({
  showId,
  scenes,
  stage,
  cameras,
  crew,
  onToast,
}: CueEditorProps) {
  const cues = useAsync<Cue[]>(() => api.cues(showId));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const list = cues.data ?? [];
  const selected = useMemo(
    () => list.find((cue) => cue.id === selectedId) ?? null,
    [list, selectedId],
  );

  // Auto-select the first cue.
  useEffect(() => {
    if (!selectedId && list.length) setSelectedId(list[0].id);
  }, [list, selectedId]);

  const reload = useCallback(async () => {
    await cues.reload();
  }, [cues]);

  /* ------------------------------- Creation ------------------------------ */

  async function addCue() {
    try {
      const created = await api.createCue(showId, { name: `Cue ${list.length + 1}` });
      await reload();
      setSelectedId(created.id);
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Cue aanmaken mislukt');
    }
  }

  async function duplicateCue(cue: Cue) {
    try {
      const copy = await api.duplicateCue(cue.id);
      await reload();
      setSelectedId(copy.id);
      onToast('Cue gedupliceerd');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Dupliceren mislukt');
    }
  }

  async function deleteCue(cue: Cue) {
    try {
      await api.deleteCue(cue.id);
      setSelectedId(null);
      await reload();
      onToast('Cue verwijderd');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Verwijderen mislukt');
    }
  }

  /* ------------------------------- Reordering ---------------------------- */

  async function commitReorder(from: number, to: number) {
    if (from === to) return;
    const ids = list.map((cue) => cue.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    try {
      await api.reorderCues(showId, ids);
      await reload();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Volgorde wijzigen mislukt');
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(280px,340px)_1fr] items-start">
      {/* ------------------------------ Timeline ----------------------------- */}
      <Panel
        title={
          <span className="flex items-center gap-2">
            <ListOrdered size={14} /> Tijdlijn
          </span>
        }
        actions={
          <Button size="sm" variant="primary" onClick={addCue}>
            <Plus size={14} />
            Cue
          </Button>
        }
        bodyClassName="p-2"
      >
        {cues.loading && list.length === 0 ? (
          <Loading />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<ListOrdered size={26} />}
            title="Nog geen cues"
            description="Maak de eerste cue om de productie te plannen."
            action={
              <Button size="sm" variant="primary" onClick={addCue}>
                <Plus size={14} /> Eerste cue
              </Button>
            }
          />
        ) : (
          <ul className="space-y-1">
            {list.map((cue, index) => {
              const scene = scenes.find((s) => s.id === cue.sceneId);
              const assignedCount = Object.keys(cue.shots ?? {}).length;
              return (
                <li
                  key={cue.id}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setOverIndex(index);
                  }}
                  onDragEnd={() => {
                    if (dragIndex !== null) void commitReorder(dragIndex, overIndex ?? dragIndex);
                    setDragIndex(null);
                    setOverIndex(null);
                  }}
                  onClick={() => setSelectedId(cue.id)}
                  className={clsx(
                    'group flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors border',
                    selectedId === cue.id
                      ? 'bg-base-750 border-accent-500/50'
                      : 'bg-base-800 border-transparent hover:bg-base-750',
                    dragIndex === index && 'opacity-40',
                    overIndex === index && dragIndex !== null && dragIndex !== index && 'ring-1 ring-accent-400',
                  )}
                >
                  <GripVertical size={14} className="text-base-600 shrink-0 cursor-grab" />
                  <span className="tabular text-xs font-semibold text-base-400 w-6 shrink-0">
                    {cue.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{cue.name || 'Naamloze cue'}</span>
                    <span className="flex items-center gap-2 text-[11px] text-base-500">
                      {scene ? (
                        <span className="flex items-center gap-1">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: scene.color }}
                          />
                          {scene.name}
                        </span>
                      ) : (
                        <span>Zonder scène</span>
                      )}
                      {assignedCount > 0 ? (
                        <span className="flex items-center gap-0.5">
                          <Camera size={10} />
                          {assignedCount}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Dupliceer"
                      onClick={(event) => {
                        event.stopPropagation();
                        void duplicateCue(cue);
                      }}
                    >
                      <Copy size={13} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Verwijder"
                      onClick={(event) => {
                        event.stopPropagation();
                        void deleteCue(cue);
                      }}
                    >
                      <Trash2 size={13} className="text-live-400" />
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* ----------------------------- Cue detail ---------------------------- */}
      {selected ? (
        <CueDetail
          key={selected.id}
          cue={selected}
          scenes={scenes}
          stage={stage}
          cameras={cameras}
          crew={crew}
          onToast={onToast}
          onDeleted={() => {
            setSelectedId(null);
            void reload();
          }}
        />
      ) : (
        <Panel>
          <EmptyState
            icon={<ListOrdered size={30} />}
            title="Selecteer een cue"
            description="Kies een cue uit de tijdlijn om deze te bewerken."
          />
        </Panel>
      )}
    </div>
  );
}

/* ================================================================== */
/* Cue detail                                                          */
/* ================================================================== */

interface CueDetailProps {
  cue: Cue;
  scenes: Scene[];
  stage: Stage | null;
  cameras: CameraModel[];
  crew: CrewMember[];
  onToast: (message: string) => void;
  onDeleted: () => void;
}

function CueDetail({
  cue,
  scenes,
  stage,
  cameras,
  crew,
  onToast,
  onDeleted,
}: CueDetailProps) {
  const [draft, setDraft] = useState<Cue>(cue);
  const [saving, setSaving] = useState(false);
  const [placementMode, setPlacementMode] = useState(false);
  const [placementOpen, setPlacementOpen] = useState(false);
  const [shotPicker, setShotPicker] = useState<string | null>(null);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const timer = useRef<number | null>(null);

  // Reload the draft whenever the cue changes on the server.
  useEffect(() => {
    setDraft(cue);
  }, [cue]);

  // Autosave with a debounce so every keystroke is not a request.
  const scheduleSave = useCallback(
    (next: Cue) => {
      setDraft(next);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(async () => {
        setSaving(true);
        try {
          await api.updateCue(next.id, {
            sceneId: next.sceneId,
            number: next.number,
            name: next.name,
            description: next.description,
            startSeconds: next.startSeconds,
            durationSeconds: next.durationSeconds,
            shots: next.shots,
            placements: next.placements,
            cameraPositions: next.cameraPositions,
            notes: next.notes,
            referenceImageUrl: next.referenceImageUrl,
            shotReferenceUrl: next.shotReferenceUrl,
          });
        } catch (error) {
          onToast(error instanceof Error ? error.message : 'Opslaan mislukt');
        } finally {
          setSaving(false);
        }
      }, 700);
    },
    [onToast],
  );

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const scene = scenes.find((s) => s.id === draft.sceneId) ?? null;
  const actors = useMemo(() => actorElements(stage), [stage]);
  const positions = useMemo(
    () => buildCuePositions(stage, draft.placements),
    [stage, draft.placements],
  );

  // Stage elements with the cue's placements applied.
  const stageElements = useMemo(() => {
    if (!stage) return [];
    return stage.elements.map((element) => {
      const position = positions.get(element.id);
      if (!position) return element;
      return { ...element, x: position.x, y: position.y, rotation: position.rotation };
    });
  }, [stage, positions]);

  function updateAssignment(cameraId: string, patch: Partial<Cue['shots'][string]>) {
    const existing =
      draft.shots[cameraId] ??
      ({ cameraId, shot: '', subject: '', movement: '', notes: '' } as Cue['shots'][string]);
    scheduleSave({
      ...draft,
      shots: { ...draft.shots, [cameraId]: { ...existing, ...patch } },
    });
  }

  function removeAssignment(cameraId: string) {
    const shots = { ...draft.shots };
    delete shots[cameraId];
    scheduleSave({ ...draft, shots });
  }

  function updatePlacement(elementId: string, x: number, y: number) {
    const existing = draft.placements.find((placement) => placement.elementId === elementId);
    const placements = existing
      ? draft.placements.map((placement) =>
          placement.elementId === elementId ? { ...placement, x, y } : placement,
        )
      : [...draft.placements, { elementId, x, y, rotation: 0 }];
    scheduleSave({ ...draft, placements });
  }

  function resetPlacements() {
    scheduleSave({ ...draft, placements: [] });
    onToast('Podiumindeling hersteld naar de basis-stage');
  }

  // Camera assignments
  const showCrewByCamera = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of crew) {
      if (member.cameraId) map.set(member.cameraId, member.name);
    }
    return map;
  }, [crew]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <Panel bodyClassName="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid place-items-center w-11 h-11 rounded-lg bg-accent-500/15 text-accent-300 font-bold text-lg tabular shrink-0">
              {draft.number}
            </span>
            <div className="min-w-0">
              <input
                className="input text-lg font-semibold h-11"
                value={draft.name}
                onChange={(event) => scheduleSave({ ...draft, name: event.target.value })}
                placeholder="Naam van de cue"
              />
              <div className="flex items-center gap-2 mt-2">
                <select
                  className="input h-8 py-1 text-xs w-auto"
                  value={draft.sceneId ?? ''}
                  onChange={(event) =>
                    scheduleSave({ ...draft, sceneId: event.target.value || null })
                  }
                >
                  <option value="">— Zonder scène —</option>
                  {scenes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {saving ? (
                  <span className="text-[11px] text-base-500">Opslaan...</span>
                ) : (
                  <span className="text-[11px] text-go-400">Opgeslagen</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => setReferenceOpen(true)}>
              <ImageIcon size={14} />
              Referentie
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={async () => {
                await api.deleteCue(cue.id);
                onDeleted();
              }}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Beschrijving">
            <textarea
              className="input text-sm"
              rows={3}
              value={draft.description}
              onChange={(event) => scheduleSave({ ...draft, description: event.target.value })}
              placeholder="Wat gebeurt er in deze cue?"
            />
          </Field>
          <div className="space-y-3">
            <Field label="Starttijd (seconden)">
              <input
                className="input"
                type="number"
                min={0}
                value={draft.startSeconds ?? ''}
                onChange={(event) =>
                  scheduleSave({
                    ...draft,
                    startSeconds: event.target.value === '' ? null : Number(event.target.value),
                  })
                }
                placeholder="0"
              />
            </Field>
            <Field label="Geschatte duur (seconden)">
              <input
                className="input"
                type="number"
                min={0}
                value={draft.durationSeconds || ''}
                onChange={(event) =>
                  scheduleSave({ ...draft, durationSeconds: Number(event.target.value) })
                }
                placeholder="30"
              />
            </Field>
          </div>
          <Field label="Notities voor de crew">
            <textarea
              className="input text-sm"
              rows={5}
              value={draft.notes}
              onChange={(event) => scheduleSave({ ...draft, notes: event.target.value })}
              placeholder="Bijv. Let op: hoofdrolspeler draait zich bij het einde van deze scène om."
            />
          </Field>
        </div>
      </Panel>

      {/* Stage + assignments */}
      <div className="grid gap-5 2xl:grid-cols-2">
        {/* Stage */}
        <Panel
          title={
            <span className="flex items-center gap-2">
              <Play size={13} /> Podiumindeling
            </span>
          }
          actions={
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant={placementMode ? 'primary' : 'secondary'}
                onClick={() => setPlacementMode((mode) => !mode)}
                title="Sleep personen en groepen om hun positie in deze cue te bepalen"
              >
                <Users size={13} />
                {placementMode ? 'Klaar met plaatsen' : 'Posities'}
              </Button>
              {draft.placements.length ? (
                <Button size="sm" variant="ghost" onClick={resetPlacements} title="Herstel">
                  Herstel
                </Button>
              ) : null}
            </div>
          }
          bodyClassName="p-2"
        >
          {stage ? (
            <>
              <CueStageCanvas
                stage={stage}
                elements={stageElements}
                editable={placementMode}
                onChange={(id, patch) => {
                  if (!placementMode) return;
                  updatePlacement(id, patch.x ?? 0, patch.y ?? 0);
                }}
              />
              <div className="px-2 py-2 flex items-center justify-between gap-2 text-[11px] text-base-500">
                <span>
                  {placementMode
                    ? 'Sleep de personen en groepen naar de juiste plek.'
                    : `${stage.name} · ${stage.widthCm}×${stage.heightCm} cm`}
                </span>
                {draft.placements.length ? (
                  <Badge tone="accent">{draft.placements.length} aangepaste posities</Badge>
                ) : null}
              </div>
            </>
          ) : (
            <EmptyState
              icon={<Play size={26} />}
              title="Geen podium gekoppeld"
              description="Koppel een podium aan deze show om de indeling te zien."
            />
          )}
        </Panel>

        {/* Camera assignments */}
        <Panel
          title={
            <span className="flex items-center gap-2">
              <Camera size={13} /> Camera-instructies
            </span>
          }
          bodyClassName="p-3 space-y-2"
        >
          {cameras.length === 0 ? (
            <EmptyState
              icon={<Camera size={26} />}
              title="Geen camera's"
              description="Voeg camera's toe via de crew-pagina."
            />
          ) : (
            cameras.map((camera) => {
              const assignment = draft.shots[camera.id];
              const operatorName = showCrewByCamera.get(camera.id);
              const isOpen = shotPicker === camera.id;
              return (
                <div
                  key={camera.id}
                  className={clsx(
                    'rounded-lg border p-3 transition-colors',
                    assignment ? 'bg-base-800 border-base-600' : 'bg-base-850 border-base-700',
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="grid place-items-center w-7 h-7 rounded-md text-xs font-bold shrink-0"
                      style={{ backgroundColor: `${camera.color}22`, color: camera.color }}
                    >
                      {camera.number}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {camera.name}
                        {operatorName ? (
                          <span className="text-base-400 font-normal"> · {operatorName}</span>
                        ) : null}
                      </p>
                    </div>
                    {assignment ? (
                      <>
                        <Badge tone="go">{assignment.shot || 'Shot'}</Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Verwijder"
                          onClick={() => removeAssignment(camera.id)}
                        >
                          <Trash2 size={13} className="text-live-400" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          scheduleSave({
                            ...draft,
                            shots: {
                              ...draft.shots,
                              [camera.id]: {
                                cameraId: camera.id,
                                shot: '',
                                subject: '',
                                movement: '',
                                notes: '',
                              },
                            },
                          })
                        }
                      >
                        Toewijzen
                      </Button>
                    )}
                  </div>

                  {assignment ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Shot">
                          <div className="relative">
                            <input
                              className="input pr-8"
                              value={assignment.shot}
                              onChange={(event) =>
                                updateAssignment(camera.id, { shot: event.target.value })
                              }
                              placeholder="Bijv. Wide shot"
                            />
                            <button
                              type="button"
                              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-base-400 hover:text-base-100"
                              onClick={() => setShotPicker(isOpen ? null : camera.id)}
                              title="Kies uit de shot library"
                            >
                              <ChevronDown size={15} />
                            </button>
                            {isOpen ? (
                              <div className="absolute z-20 mt-1 w-full rounded-md bg-base-750 border border-base-600 shadow-xl p-1 max-h-56 overflow-y-auto">
                                {STANDARD_SHOTS.map((shot) => (
                                  <button
                                    key={shot}
                                    type="button"
                                    className="block w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-base-700"
                                    onClick={() => {
                                      updateAssignment(camera.id, { shot });
                                      setShotPicker(null);
                                    }}
                                  >
                                    {shot}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </Field>
                        <Field label="Volg (persoon/groep)">
                          <input
                            className="input"
                            value={assignment.subject}
                            onChange={(event) =>
                              updateAssignment(camera.id, { subject: event.target.value })
                            }
                            placeholder="Bijv. Emma - Hoofdrol"
                            list={`subjects-${camera.id}`}
                          />
                          <datalist id={`subjects-${camera.id}`}>
                            {actors.map((actor) => (
                              <option key={actor.id} value={actor.name} />
                            ))}
                          </datalist>
                        </Field>
                      </div>
                      <Field label="Camerabeweging">
                        <input
                          className="input"
                          value={assignment.movement}
                          onChange={(event) =>
                            updateAssignment(camera.id, { movement: event.target.value })
                          }
                          placeholder="Bijv. Slow push in"
                        />
                      </Field>
                      <Field label="Extra instructie">
                        <input
                          className="input"
                          value={assignment.notes}
                          onChange={(event) =>
                            updateAssignment(camera.id, { notes: event.target.value })
                          }
                          placeholder="Optionele aanwijzing"
                        />
                      </Field>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </Panel>
      </div>

      {/* Placement helper */}
      <Modal
        open={placementOpen}
        title="Posities van personen en groepen"
        onClose={() => setPlacementOpen(false)}
        footer={
          <Button variant="primary" onClick={() => setPlacementOpen(false)}>
            Sluiten
          </Button>
        }
      >
        <div className="space-y-2">
          {actors.length === 0 ? (
            <p className="text-sm text-base-400">
              Er zijn geen personen of groepen in dit podium. Voeg ze toe in de Stage Builder.
            </p>
          ) : (
            actors.map((actor) => {
              const placement = draft.placements.find((item) => item.elementId === actor.id);
              return (
                <div
                  key={actor.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-base-800"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: String(actor.props?.color ?? '#ef4444') }}
                  />
                  <span className="text-sm flex-1 truncate">{actor.name || 'Naamloos'}</span>
                  {placement ? (
                    <span className="text-xs text-base-400 tabular">
                      x {placement.x} · y {placement.y}
                    </span>
                  ) : (
                    <span className="text-xs text-base-500">basispositie</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Modal>

      {/* Reference image */}
      <Modal
        open={referenceOpen}
        title="Referentiebeeld"
        onClose={() => setReferenceOpen(false)}
        footer={
          <Button variant="primary" onClick={() => setReferenceOpen(false)}>
            Sluiten
          </Button>
        }
      >
        <ReferenceEditor
          cue={draft}
          onChange={(patch) => scheduleSave({ ...draft, ...patch })}
          onToast={onToast}
        />
      </Modal>

      {/* Summary strip */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-base-400 px-1">
        <span className="flex items-center gap-1.5">
          <Clock size={13} />
          Start {formatTimecode(draft.startSeconds, 'mm:ss')} · {formatDuration(draft.durationSeconds)}
        </span>
        <span className="flex items-center gap-1.5">
          <Camera size={13} />
          {Object.keys(draft.shots).length} camera's toegewezen
        </span>
        <span className="flex items-center gap-1.5">
          <Users size={13} />
          {draft.placements.length} aangepaste posities
        </span>
        {draft.notes ? (
          <span className="flex items-center gap-1.5 text-signal-300">
            <StickyNote size={13} />
            Notitie aanwezig
          </span>
        ) : null}
        {scene ? (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: scene.color }} />
            {scene.name}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Responsive stage canvas for the cue editor                          */
/* ------------------------------------------------------------------ */

function CueStageCanvas({
  stage,
  elements,
  editable,
  onChange,
}: {
  stage: Stage;
  elements: StageElement[];
  editable: boolean;
  onChange: (id: string, patch: Partial<StageElement>) => void;
}) {
  const { ref, size } = useElementSize<HTMLDivElement>();

  const scale = useMemo(() => {
    if (!size.width) return 0.3;
    const available = size.width - 24;
    return Math.max(0.12, Math.min(0.5, available / stage.widthCm));
  }, [size.width, stage.widthCm]);

  const height = Math.max(220, Math.round(stage.heightCm * scale + 90));

  return (
    <div ref={ref} className="w-full overflow-hidden rounded-lg bg-base-950">
      {size.width > 0 ? (
        <StageCanvas
          stage={stage}
          elements={elements}
          scale={scale}
          width={size.width}
          height={height}
          editable={editable}
          onChange={onChange}
          showGrid
          showCameraDirections
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reference image editor                                              */
/* ------------------------------------------------------------------ */

function ReferenceEditor({
  cue,
  onChange,
  onToast,
}: {
  cue: Cue;
  onChange: (patch: Partial<Cue>) => void;
  onToast: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Kan bestand niet lezen'));
        reader.readAsDataURL(file);
      });
      const { url } = await api.uploadImage(dataUrl);
      onChange({ referenceImageUrl: url });
      onToast('Referentiebeeld opgeslagen');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Upload mislukt');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Podiumreferentie" hint="Toont de standaard podiumindeling bij deze cue.">
        <div className="flex items-center gap-3">
          <label className="btn btn-secondary btn-sm cursor-pointer">
            <ImageIcon size={14} />
            {busy ? 'Uploaden...' : 'Afbeelding kiezen'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
                event.target.value = '';
              }}
            />
          </label>
          {cue.referenceImageUrl ? (
            <Button size="sm" variant="ghost" onClick={() => onChange({ referenceImageUrl: null })}>
              Verwijderen
            </Button>
          ) : null}
        </div>
      </Field>

      {cue.referenceImageUrl ? (
        <img
          src={cue.referenceImageUrl}
          alt="Referentiebeeld"
          className="rounded-lg border border-base-700 max-h-72 w-full object-contain bg-base-900"
        />
      ) : null}

      <Field label="Shot referentie" hint="Voorbeeldbeeld van het gewenste shot.">
        <div className="flex items-center gap-3">
          <label className="btn btn-secondary btn-sm cursor-pointer">
            <ImageIcon size={14} />
            {busy ? 'Uploaden...' : 'Afbeelding kiezen'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setBusy(true);
                try {
                  const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result));
                    reader.onerror = () => reject(new Error('Kan bestand niet lezen'));
                    reader.readAsDataURL(file);
                  });
                  const { url } = await api.uploadImage(dataUrl);
                  onChange({ shotReferenceUrl: url });
                  onToast('Shotreferentie opgeslagen');
                } catch (error) {
                  onToast(error instanceof Error ? error.message : 'Upload mislukt');
                } finally {
                  setBusy(false);
                  event.target.value = '';
                }
              }}
            />
          </label>
          {cue.shotReferenceUrl ? (
            <Button size="sm" variant="ghost" onClick={() => onChange({ shotReferenceUrl: null })}>
              Verwijderen
            </Button>
          ) : null}
        </div>
      </Field>

      {cue.shotReferenceUrl ? (
        <img
          src={cue.shotReferenceUrl}
          alt="Shot referentie"
          className="rounded-lg border border-base-700 max-h-72 w-full object-contain bg-base-900"
        />
      ) : null}
    </div>
  );
}
