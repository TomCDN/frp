import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Clapperboard,
  Plus,
  CalendarClock,
  Layers,
  ListOrdered,
  Users,
  Camera,
  ArrowRight,
  Copy,
  Archive,
  FileText,
  Radio,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '../lib/api';
import { useAsync } from '../hooks/useApi';
import { formatDate, formatRelative } from '../lib/utils';
import { Button, EmptyState, Loading, Modal, Panel, StatCard, Field, Badge, Toast } from '../components/ui';
import { PageHeader } from '../components/DirectorShell';
import type { DashboardStats, ShowSummary, Stage } from '../types';

export function DashboardPage() {
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);

  const stats = useAsync<DashboardStats>(() => api.stats());
  const overview = useAsync(() => api.overview());
  const stages = useAsync<Stage[]>(() => api.stages());

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!createOpen) {
      setNewName('');
      setNewDate('');
      setNewLocation('');
    }
  }, [createOpen]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const show = await api.createShow({
        name: newName.trim(),
        date: newDate || null,
        location: newLocation.trim(),
      });
      setCreateOpen(false);
      navigate(`/shows/${show.id}`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Aanmaken mislukt');
    } finally {
      setBusy(false);
    }
  }

  async function handleDuplicate(show: ShowSummary) {
    try {
      await api.duplicateShow(show.id);
      setToast(`"${show.name}" is gedupliceerd`);
      await overview.reload();
      await stats.reload();
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Dupliceren mislukt');
    }
  }

  async function handleArchive(show: ShowSummary) {
    try {
      await api.updateShow(show.id, { archived: !show.archived });
      setToast(show.archived ? `"${show.name}" is hervat` : `"${show.name}" is gearchiveerd`);
      await overview.reload();
      await stats.reload();
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Archiveren mislukt');
    }
  }

  const s = stats.data;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <PageHeader
        icon={<Clapperboard size={20} />}
        title="Dashboard"
        description="Overzicht van alle producties, podia en crew"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                const template = overview.data?.templates[0];
                if (!template) {
                  setToast('Er is nog geen template beschikbaar');
                  return;
                }
                navigate(`/shows?template=${template.id}`);
              }}
            >
              <FileText size={15} />
              Nieuwe show uit template
            </Button>
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              Nieuwe show
            </Button>
          </>
        }
      />

      {stats.loading && !s ? (
        <Loading label="Dashboard laden..." />
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 mb-6">
            <StatCard
              label="Shows"
              value={s?.showCount ?? 0}
              icon={<Clapperboard size={20} />}
              accent="#3b82f6"
              hint={`${s?.upcomingShowCount ?? 0} aankomend`}
              onClick={() => navigate('/shows')}
            />
            <StatCard
              label="Aankomende shows"
              value={s?.upcomingShowCount ?? 0}
              icon={<CalendarClock size={20} />}
              accent="#f59e0b"
              onClick={() => navigate('/shows')}
            />
            <StatCard
              label="Opgeslagen podia"
              value={s?.stageCount ?? 0}
              icon={<Layers size={20} />}
              accent="#a855f7"
              onClick={() => navigate('/stages')}
            />
            <StatCard
              label="Cues"
              value={s?.cueCount ?? 0}
              icon={<ListOrdered size={20} />}
              accent="#22c55e"
            />
            <StatCard
              label="Cameramensen"
              value={s?.activeCrewCount ?? 0}
              icon={<Users size={20} />}
              accent="#06b6d4"
              onClick={() => navigate('/crew')}
            />
            <StatCard
              label="Camera's"
              value={s?.cameraCount ?? 0}
              icon={<Camera size={20} />}
              accent="#ec4899"
              onClick={() => navigate('/crew')}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2 space-y-6">
              <Panel
                title="Aankomende shows"
                actions={
                  <Link to="/shows" className="text-xs text-accent-300 hover:text-accent-200">
                    Alles bekijken
                  </Link>
                }
                bodyClassName="p-3"
              >
                {overview.loading ? (
                  <Loading />
                ) : overview.data?.upcoming.length ? (
                  <ul className="space-y-2">
                    {overview.data.upcoming.map((show) => (
                      <ShowRow key={show.id} show={show} onDuplicate={handleDuplicate} onArchive={handleArchive} />
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={<CalendarClock size={28} />}
                    title="Geen aankomende shows"
                    description="Maak een nieuwe show aan om een productie voor te bereiden."
                    action={
                      <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
                        <Plus size={14} /> Nieuwe show
                      </Button>
                    }
                  />
                )}
              </Panel>

              <Panel
                title="Recente shows"
                actions={
                  <Link to="/shows" className="text-xs text-accent-300 hover:text-accent-200">
                    Alles bekijken
                  </Link>
                }
                bodyClassName="p-3"
              >
                {overview.loading ? (
                  <Loading />
                ) : overview.data?.recent.length ? (
                  <ul className="space-y-2">
                    {overview.data.recent.map((show) => (
                      <ShowRow key={show.id} show={show} onDuplicate={handleDuplicate} onArchive={handleArchive} />
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={<Clapperboard size={28} />}
                    title="Nog geen shows"
                    description="De voorbeeldshow 'Musical 2027' staat klaar om te testen."
                    action={
                      <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
                        <Plus size={14} /> Nieuwe show
                      </Button>
                    }
                  />
                )}
              </Panel>
            </div>

            <div className="space-y-6">
              <Panel
                title="Opgeslagen podia"
                actions={
                  <Link to="/stages" className="text-xs text-accent-300 hover:text-accent-200">
                    Beheer
                  </Link>
                }
                bodyClassName="p-3"
              >
                {stages.loading ? (
                  <Loading />
                ) : stages.data?.length ? (
                  <ul className="space-y-1.5">
                    {stages.data.slice(0, 6).map((stage) => (
                      <li key={stage.id}>
                        <Link
                          to={`/stages/${stage.id}`}
                          className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md hover:bg-base-800 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{stage.name}</p>
                            <p className="text-xs text-base-400">
                              {stage.widthCm}×{stage.heightCm} cm · {stage.elements.length} elementen
                            </p>
                          </div>
                          <ArrowRight size={15} className="text-base-500 shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={<Layers size={28} />}
                    title="Nog geen podia"
                    description="Bouw een podium in de Stage Builder."
                    action={
                      <Link to="/stages" className="btn btn-primary btn-sm">
                        <Plus size={14} /> Podium
                      </Link>
                    }
                  />
                )}
              </Panel>

              {overview.data?.templates.length ? (
                <Panel title="Show templates" bodyClassName="p-3">
                  <ul className="space-y-1.5">
                    {overview.data.templates.map((template) => (
                      <li
                        key={template.id}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md bg-base-800"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{template.name}</p>
                          <p className="text-xs text-base-400">
                            {template.cueCount} cues · {template.sceneCount} scènes
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={async () => {
                            try {
                              const created = await api.createFromTemplate(
                                template.id,
                                `${template.name.replace(/^Template\s*-\s*/, '')} (kopie)`,
                              );
                              navigate(`/shows/${created.id}`);
                            } catch (error) {
                              setToast(error instanceof Error ? error.message : 'Mislukt');
                            }
                          }}
                        >
                          Gebruiken
                        </Button>
                      </li>
                    ))}
                  </ul>
                </Panel>
              ) : null}

              {overview.data?.archived.length ? (
                <Panel title="Gearchiveerd" bodyClassName="p-3">
                  <ul className="space-y-1.5">
                    {overview.data.archived.map((show) => (
                      <li
                        key={show.id}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md bg-base-800 opacity-70"
                      >
                        <p className="text-sm truncate">{show.name}</p>
                        <Button size="sm" variant="ghost" onClick={() => handleArchive(show)}>
                          Herstellen
                        </Button>
                      </li>
                    ))}
                  </ul>
                </Panel>
              ) : null}
            </div>
          </div>
        </>
      )}

      <Modal
        open={createOpen}
        title="Nieuwe show"
        onClose={() => setCreateOpen(false)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Annuleren
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={busy || !newName.trim()}>
              Aanmaken
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Naam van de show">
            <input
              className="input"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Bijv. Musical 2027"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleCreate();
              }}
            />
          </Field>
          <Field label="Datum">
            <input
              className="input"
              type="date"
              value={newDate}
              onChange={(event) => setNewDate(event.target.value)}
            />
          </Field>
          <Field label="Locatie">
            <input
              className="input"
              value={newLocation}
              onChange={(event) => setNewLocation(event.target.value)}
              placeholder="Bijv. Theater De Voorsteilin"
            />
          </Field>
        </div>
      </Modal>

      {toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}

function ShowRow({
  show,
  onDuplicate,
  onArchive,
}: {
  show: ShowSummary;
  onDuplicate: (show: ShowSummary) => void;
  onArchive: (show: ShowSummary) => void;
}) {
  return (
    <li className="group flex items-center gap-3 px-3 py-3 rounded-lg bg-base-800 hover:bg-base-750 transition-colors">
      <Link to={`/shows/${show.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <span
          className={clsx(
            'w-1 self-stretch rounded-full shrink-0',
            show.archived ? 'bg-base-600' : 'bg-accent-500',
          )}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate">{show.name}</p>
            {show.archived ? <Badge tone="neutral">Gearchiveerd</Badge> : null}
            {show.isTemplate ? <Badge tone="accent">Template</Badge> : null}
          </div>
          <p className="text-xs text-base-400 mt-0.5 truncate">
            {show.date ? formatDate(show.date) : 'Geen datum'} · {show.location || 'Geen locatie'} ·{' '}
            {show.cueCount} cues · {show.sceneCount} scènes
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <Button size="sm" variant="ghost" onClick={() => onDuplicate(show)} title="Dupliceer">
          <Copy size={14} />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onArchive(show)} title="Archiveer">
          <Archive size={14} />
        </Button>
        <Link to={`/live/${show.id}`} className="btn btn-secondary btn-sm" title="Open live regie">
          <Radio size={14} />
        </Link>
      </div>
      <span className="text-xs text-base-500 shrink-0 hidden sm:block">
        {formatRelative(show.updatedAt)}
      </span>
    </li>
  );
}
