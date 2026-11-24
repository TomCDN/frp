import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clapperboard,
  ListOrdered,
  Users,
  Settings2,
  Radio,
  FileDown,
  Layers,
  Plus,
  Pencil,
  Copy,
  Archive,
  Trash2,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '../lib/api';
import { useAsync, useAsyncWhen } from '../hooks/useApi';
import { formatDate } from '../lib/utils';
import { Badge, Button, ConfirmDialog, EmptyState, Field, Loading, Modal, Panel, Toast, Toggle } from '../components/ui';
import { CueEditor } from '../components/CueEditor';
import { CrewPanel } from '../components/CrewPanel';
import { MessagesPanel } from '../components/MessagesPanel';
import type { Camera, CrewMember, Scene, Show, ShowSettings, Stage } from '../types';

type Tab = 'overview' | 'cues' | 'crew' | 'settings';

export function ShowDetailPage() {
  const { showId = '' } = useParams();
  const navigate = useNavigate();

  const show = useAsync<Show>(() => api.show(showId));
  const scenes = useAsync<Scene[]>(() => api.scenes(showId));
  const crew = useAsync<CrewMember[]>(() => api.crew());
  const cameras = useAsync<Camera[]>(() => api.cameras());

  const [tab, setTab] = useState<Tab>('overview');
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sceneModalOpen, setSceneModalOpen] = useState(false);
  const [newScene, setNewScene] = useState({ name: '', description: '', color: '#3b82f6' });
  const [form, setForm] = useState({ name: '', description: '', date: '', location: '' });

  useEffect(() => {
    if (show.data) {
      setForm({
        name: show.data.name,
        description: show.data.description,
        date: show.data.date ?? '',
        location: show.data.location,
      });
    }
  }, [show.data]);

  const stage = useAsyncWhen<Stage | null>(
    async () => {
      const stageId = show.data?.stageId;
      if (!stageId) return null;
      return api.stage(stageId);
    },
    Boolean(show.data?.stageId),
    [show.data?.stageId],
  );

  const handleSave = useCallback(async () => {
    try {
      await api.updateShow(showId, {
        name: form.name.trim(),
        description: form.description.trim(),
        date: form.date || null,
        location: form.location.trim(),
      });
      await show.reload();
      setEditing(false);
      setToast('Show opgeslagen');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Opslaan mislukt');
    }
  }, [form, show, showId]);

  const handleDelete = useCallback(async () => {
    try {
      await api.deleteShow(showId);
      navigate('/shows');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Verwijderen mislukt');
      setDeleting(false);
    }
  }, [navigate, showId]);

  async function handleCreateScene() {
    if (!newScene.name.trim()) return;
    try {
      await api.createScene(showId, {
        name: newScene.name.trim(),
        description: newScene.description.trim(),
        color: newScene.color,
      });
      await scenes.reload();
      setSceneModalOpen(false);
      setNewScene({ name: '', description: '', color: '#3b82f6' });
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Scène aanmaken mislukt');
    }
  }

  const tabs: Array<{ key: Tab; label: string; icon: typeof ListOrdered }> = [
    { key: 'overview', label: 'Overzicht', icon: Clapperboard },
    { key: 'cues', label: 'Cues', icon: ListOrdered },
    { key: 'crew', label: 'Crew', icon: Users },
    { key: 'settings', label: 'Instellingen', icon: Settings2 },
  ];

  if (show.loading && !show.data) return <Loading label="Show laden..." />;

  if (!show.data) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Clapperboard size={30} />}
          title="Show niet gevonden"
          description="Deze show bestaat niet meer of is verwijderd."
          action={
            <Link to="/shows" className="btn btn-primary btn-sm">
              Terug naar shows
            </Link>
          }
        />
      </div>
    );
  }

  const current = show.data;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <Link
        to="/shows"
        className="inline-flex items-center gap-1.5 text-xs text-base-400 hover:text-base-200 mb-4"
      >
        <ArrowLeft size={14} /> Alle shows
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-semibold">{current.name}</h1>
            {current.archived ? <Badge tone="neutral">Gearchiveerd</Badge> : null}
            {current.isTemplate ? <Badge tone="accent">Template</Badge> : null}
          </div>
          <p className="text-sm text-base-400 mt-1">
            {current.date ? formatDate(current.date) : 'Geen datum'}
            {current.location ? ` · ${current.location}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={`/api/export/shows/${showId}/pdf`}
            className="btn btn-secondary btn-sm"
            title="Exporteer draaiboek als PDF"
          >
            <FileDown size={15} />
            Draaiboek PDF
          </a>
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            <Pencil size={15} />
            Bewerken
          </Button>
          <Link to={`/live/${showId}`} className="btn btn-primary btn-sm">
            <Radio size={15} />
            Live regie
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-6 border-b border-base-700 overflow-x-auto">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              tab === item.key
                ? 'border-accent-400 text-base-100'
                : 'border-transparent text-base-400 hover:text-base-200',
            )}
          >
            <item.icon size={16} />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Panel title="Over de show">
              {current.description ? (
                <p className="text-sm text-base-200 leading-relaxed whitespace-pre-wrap">
                  {current.description}
                </p>
              ) : (
                <p className="text-sm text-base-400">Nog geen beschrijving.</p>
              )}
            </Panel>

            <Panel
              title="Scènes"
              actions={
                <Button size="sm" variant="secondary" onClick={() => setSceneModalOpen(true)}>
                  <Plus size={14} />
                  Scène
                </Button>
              }
              bodyClassName="p-3"
            >
              {scenes.loading ? (
                <Loading />
              ) : scenes.data?.length ? (
                <ul className="space-y-2">
                  {scenes.data.map((scene) => (
                    <SceneRow
                      key={scene.id}
                      scene={scene}
                      onChanged={scenes.reload}
                      onError={setToast}
                    />
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={<ListOrdered size={26} />}
                  title="Nog geen scènes"
                  description="Deel de voorstelling op in scènes om cues te ordenen."
                  action={
                    <Button size="sm" variant="primary" onClick={() => setSceneModalOpen(true)}>
                      <Plus size={14} /> Scène toevoegen
                    </Button>
                  }
                />
              )}
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Podium">
              {stage.data ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Layers size={15} className="text-accent-700" />
                    <span className="font-medium">{stage.data.name}</span>
                  </div>
                  <p className="text-xs text-base-400">
                    {stage.data.widthCm} × {stage.data.heightCm} cm · {stage.data.elements.length} elementen
                  </p>
                  <Link to={`/stages/${stage.data.id}`} className="btn btn-secondary btn-sm w-full">
                    Podium openen
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-base-400">Geen podium gekoppeld aan deze show.</p>
              )}
            </Panel>

            <MessagesPanel showId={showId} />

            <Panel title="Snelacties">
              <div className="flex flex-col gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    await api.duplicateShow(showId);
                    setToast('Show gedupliceerd');
                  }}
                >
                  <Copy size={14} /> Show dupliceren
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    await api.updateShow(showId, { archived: !current.archived });
                    await show.reload();
                  }}
                >
                  <Archive size={14} />
                  {current.archived ? 'Show herstellen' : 'Show archiveren'}
                </Button>
                <Button variant="danger" size="sm" onClick={() => setDeleting(true)}>
                  <Trash2 size={14} /> Show verwijderen
                </Button>
              </div>
            </Panel>
          </div>
        </div>
      ) : null}

      {tab === 'cues' ? (
        <CueEditor
          showId={showId}
          scenes={scenes.data ?? []}
          stage={stage.data ?? null}
          cameras={cameras.data ?? []}
          crew={crew.data ?? []}
          onToast={setToast}
        />
      ) : null}

      {tab === 'crew' ? (
        <CrewPanel showId={showId} crew={crew.data ?? []} cameras={cameras.data ?? []} onToast={setToast} />
      ) : null}

      {tab === 'settings' ? (
        <SettingsPanel show={current} onToast={setToast} />
      ) : null}

      {/* Edit show modal */}
      <Modal
        open={editing}
        title="Show bewerken"
        onClose={() => setEditing(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Annuleren
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Opslaan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Naam van de show">
            <input
              className="input"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>
          <Field label="Beschrijving">
            <textarea
              className="input"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Datum">
              <input
                className="input"
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
              />
            </Field>
            <Field label="Locatie">
              <input
                className="input"
                value={form.location}
                onChange={(event) => setForm({ ...form, location: event.target.value })}
              />
            </Field>
          </div>
        </div>
      </Modal>

      {/* Create scene modal */}
      <Modal
        open={sceneModalOpen}
        title="Nieuwe scène"
        onClose={() => setSceneModalOpen(false)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSceneModalOpen(false)}>
              Annuleren
            </Button>
            <Button variant="primary" onClick={handleCreateScene} disabled={!newScene.name.trim()}>
              Aanmaken
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Naam">
            <input
              className="input"
              value={newScene.name}
              onChange={(event) => setNewScene({ ...newScene, name: event.target.value })}
              placeholder="Bijv. Acte 1"
              autoFocus
            />
          </Field>
          <Field label="Beschrijving">
            <textarea
              className="input"
              value={newScene.description}
              onChange={(event) => setNewScene({ ...newScene, description: event.target.value })}
            />
          </Field>
          <Field label="Kleur">
            <input
              className="input h-10 p-1"
              type="color"
              value={newScene.color}
              onChange={(event) => setNewScene({ ...newScene, color: event.target.value })}
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting}
        title="Show verwijderen"
        message={`"${current.name}" wordt definitief verwijderd, inclusief alle scènes, cues en podiumindelingen.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(false)}
      />

      {toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scene row                                                           */
/* ------------------------------------------------------------------ */

function SceneRow({
  scene,
  onChanged,
  onError,
}: {
  scene: Scene;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(scene.name);

  async function save() {
    try {
      await api.updateScene(scene.id, { name: name.trim() || scene.name });
      await onChanged();
      setEditing(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Opslaan mislukt');
    }
  }

  return (
    <li
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-base-800"
      style={{ borderLeft: `3px solid ${scene.color}` }}
    >
      {editing ? (
        <input
          className="input flex-1"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void save();
            if (event.key === 'Escape') setEditing(false);
          }}
        />
      ) : (
        <button
          type="button"
          className="flex-1 text-left min-w-0"
          onClick={() => {
            setName(scene.name);
            setEditing(true);
          }}
        >
          <p className="text-sm font-medium truncate">{scene.name}</p>
          {scene.description ? (
            <p className="text-xs text-base-400 truncate">{scene.description}</p>
          ) : null}
        </button>
      )}
      <Button
        size="sm"
        variant="ghost"
        title="Verwijder"
        onClick={async () => {
          try {
            await api.deleteScene(scene.id);
            await onChanged();
          } catch (error) {
            onError(error instanceof Error ? error.message : 'Verwijderen mislukt');
          }
        }}
      >
        <Trash2 size={14} className="text-live-500" />
      </Button>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

function SettingsPanel({ show, onToast }: { show: Show; onToast: (message: string) => void }) {
  const [settings, setSettings] = useState<ShowSettings>(show.settings);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setSettings(show.settings);
    setDirty(false);
  }, [show.settings]);

  async function save() {
    try {
      await api.updateShow(show.id, { settings });
      setDirty(false);
      onToast('Instellingen opgeslagen');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Opslaan mislukt');
    }
  }

  function update<K extends keyof ShowSettings>(key: K, value: ShowSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 max-w-4xl">
      <Panel title="Live regie">
        <div className="space-y-1">
          <Toggle
            checked={settings.operatorsCanAcknowledge}
            onChange={(value) => update('operatorsCanAcknowledge', value)}
            label="Cameramensen mogen opdrachten afvinken"
            description="Toont een 'opdracht ontvangen'-knop op de iPad."
          />
          <Toggle
            checked={settings.alertOnNewCue}
            onChange={(value) => update('alertOnNewCue', value)}
            label="Waarschuwen bij een nieuwe cue"
            description="De operator krijgt een duidelijk visueel signaal."
          />
          <div className="pt-3">
            <Field label="Countdown voor de volgende cue (seconden)">
              <input
                className="input"
                type="number"
                min={0}
                max={60}
                value={settings.countdownSeconds}
                onChange={(event) => update('countdownSeconds', Number(event.target.value))}
              />
            </Field>
          </div>
          <div className="pt-3">
            <Field label="Tijdcode formaat">
              <select
                className="input"
                value={settings.timecodeFormat}
                onChange={(event) =>
                  update('timecodeFormat', event.target.value as ShowSettings['timecodeFormat'])
                }
              >
                <option value="mm:ss">mm:ss</option>
                <option value="hh:mm:ss">uu:mm:ss</option>
                <option value="seconds">Alleen seconden</option>
              </select>
            </Field>
          </div>
          <div className="pt-3">
            <Field label="Wachttekst op het operator scherm">
              <input
                className="input"
                value={settings.standbyMessage}
                onChange={(event) => update('standbyMessage', event.target.value)}
                placeholder="Wachten op regie..."
              />
            </Field>
          </div>
        </div>
      </Panel>

      <Panel title="Podium koppeling">
        <PodiumLink show={show} onToast={onToast} />
      </Panel>

      <div className="lg:col-span-2 flex justify-end">
        <Button variant="primary" onClick={save} disabled={!dirty}>
          Instellingen opslaan
        </Button>
      </div>
    </div>
  );
}

function PodiumLink({ show, onToast }: { show: Show; onToast: (message: string) => void }) {
  const stages = useAsync(() => api.stages());

  return (
    <div className="space-y-3">
      <p className="text-xs text-base-400">
        Het podium dat bij deze show hoort. De podiumindeling per cue wordt opgeslagen in de cue zelf, zodat
        de show op een ander podium ook werkt.
      </p>
      <select
        className="input"
        value={show.stageId ?? ''}
        onChange={async (event) => {
          try {
            await api.updateShow(show.id, { stageId: event.target.value || null });
            onToast('Podium gekoppeld');
          } catch (error) {
            onToast(error instanceof Error ? error.message : 'Koppelen mislukt');
          }
        }}
      >
        <option value="">— Geen podium gekoppeld —</option>
        {stages.data?.map((stage) => (
          <option key={stage.id} value={stage.id}>
            {stage.name} ({stage.widthCm}×{stage.heightCm} cm)
          </option>
        ))}
      </select>
      {show.stageId ? (
        <Link to={`/stages/${show.stageId}`} className="btn btn-secondary btn-sm w-full">
          Podium openen in Stage Builder
        </Link>
      ) : null}
    </div>
  );
}
