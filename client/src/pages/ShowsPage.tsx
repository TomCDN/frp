import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Clapperboard, Search, Copy, Archive, Trash2, FileText, Radio, CalendarClock } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../lib/api';
import { useAsync } from '../hooks/useApi';
import { formatDate, formatRelative } from '../lib/utils';
import { Button, ConfirmDialog, EmptyState, Loading, Modal, Field, Badge, Toast, Toggle } from '../components/ui';
import { PageHeader } from '../components/DirectorShell';
import type { ShowSummary } from '../types';

type Filter = 'all' | 'upcoming' | 'archived' | 'templates';

export function ShowsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const shows = useAsync<ShowSummary[]>(() => api.showSummaries());

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ShowSummary | null>(null);
  const [deleting, setDeleting] = useState<ShowSummary | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    date: '',
    location: '',
    isTemplate: false,
    archived: false,
  });

  // A template id in the URL opens the "new show from template" dialog.
  const templateId = searchParams.get('template');

  useEffect(() => {
    if (!templateId) return;
    setCreateOpen(true);
  }, [templateId]);

  useEffect(() => {
    if (!createOpen) {
      setForm({
        name: '',
        description: '',
        date: '',
        location: '',
        isTemplate: false,
        archived: false,
      });
    }
  }, [createOpen]);

  const filtered = useMemo(() => {
    const all = shows.data ?? [];
    const today = new Date().toISOString().slice(0, 10);
    return all.filter((show) => {
      if (filter === 'upcoming') {
        return !show.archived && !show.isTemplate && (show.date === null || show.date >= today);
      }
      if (filter === 'archived') return show.archived;
      if (filter === 'templates') return show.isTemplate;
      return true;
    });
  }, [shows.data, filter]);

  const searched = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return filtered;
    return filtered.filter(
      (show) =>
        show.name.toLowerCase().includes(term) ||
        show.location.toLowerCase().includes(term) ||
        show.description.toLowerCase().includes(term),
    );
  }, [filtered, query]);

  async function handleCreate() {
    if (!form.name.trim()) return;
    try {
      if (templateId) {
        const created = await api.createFromTemplate(templateId, form.name.trim());
        setCreateOpen(false);
        setSearchParams({});
        navigate(`/shows/${created.id}`);
        return;
      }
      const created = await api.createShow({
        name: form.name.trim(),
        description: form.description.trim(),
        date: form.date || null,
        location: form.location.trim(),
        isTemplate: form.isTemplate,
      });
      setCreateOpen(false);
      await shows.reload();
      navigate(`/shows/${created.id}`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Aanmaken mislukt');
    }
  }

  async function handleSaveEdit() {
    if (!editing) return;
    try {
      await api.updateShow(editing.id, {
        name: form.name.trim(),
        description: form.description.trim(),
        date: form.date || null,
        location: form.location.trim(),
        isTemplate: form.isTemplate,
        archived: form.archived,
      });
      setEditing(null);
      await shows.reload();
      setToast('Show bijgewerkt');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Opslaan mislukt');
    }
  }

  async function handleDuplicate(show: ShowSummary) {
    try {
      await api.duplicateShow(show.id);
      await shows.reload();
      setToast(`"${show.name}" is gedupliceerd`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Dupliceren mislukt');
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await api.deleteShow(deleting.id);
      await shows.reload();
      setToast(`"${deleting.name}" is verwijderd`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Verwijderen mislukt');
    } finally {
      setDeleting(null);
    }
  }

  const counts = useMemo(() => {
    const all = shows.data ?? [];
    const today = new Date().toISOString().slice(0, 10);
    return {
      all: all.length,
      upcoming: all.filter((s) => !s.archived && !s.isTemplate && (s.date === null || s.date >= today)).length,
      archived: all.filter((s) => s.archived).length,
      templates: all.filter((s) => s.isTemplate).length,
    };
  }, [shows.data]);

  const filters: Array<{ key: Filter; label: string; count: number }> = [
    { key: 'all', label: 'Alle', count: counts.all },
    { key: 'upcoming', label: 'Aankomend', count: counts.upcoming },
    { key: 'archived', label: 'Gearchiveerd', count: counts.archived },
    { key: 'templates', label: 'Templates', count: counts.templates },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <PageHeader
        icon={<Clapperboard size={20} />}
        title="Shows"
        description={`${counts.all} producties in totaal`}
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            Nieuwe show
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-500 pointer-events-none" />
          <input
            className="input pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Zoek shows..."
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-base-850 border border-base-700">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                filter === item.key ? 'bg-base-700 text-base-100' : 'text-base-400 hover:text-base-200',
              )}
            >
              {item.label}
              <span className="ml-1.5 text-base-500 tabular">{item.count}</span>
            </button>
          ))}
        </div>
      </div>

      {shows.loading ? (
        <Loading label="Shows laden..." />
      ) : searched.length === 0 ? (
        <EmptyState
          icon={<Clapperboard size={30} />}
          title={query ? 'Geen resultaten' : 'Nog geen shows'}
          description={
            query
              ? 'Probeer een andere zoekterm.'
              : 'Maak je eerste show aan om te beginnen met voorbereiden.'
          }
          action={
            !query ? (
              <Button variant="primary" onClick={() => setCreateOpen(true)}>
                <Plus size={15} /> Nieuwe show
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {searched.map((show) => (
            <article
              key={show.id}
              className="panel p-4 flex flex-col gap-3 hover:border-base-600 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <Link to={`/shows/${show.id}`} className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate hover:text-accent-700">{show.name}</h3>
                  <p className="text-xs text-base-400 mt-1 line-clamp-2 min-h-[2rem]">
                    {show.description || 'Geen beschrijving'}
                  </p>
                </Link>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {show.archived ? <Badge tone="neutral">Gearchiveerd</Badge> : null}
                  {show.isTemplate ? <Badge tone="accent">Template</Badge> : null}
                  {!show.archived && !show.isTemplate ? <Badge tone="go">Actief</Badge> : null}
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-base-400">
                  <CalendarClock size={13} />
                  <span className="text-base-200">{show.date ? formatDate(show.date) : 'Geen datum'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-base-400 truncate">
                  <span className="text-base-200 truncate">{show.location || 'Geen locatie'}</span>
                </div>
              </dl>

              <div className="flex items-center gap-3 text-xs text-base-400 pt-2 border-t border-base-700">
                <span>{show.cueCount} cues</span>
                <span>·</span>
                <span>{show.sceneCount} scènes</span>
                <span>·</span>
                <span>{show.crewCount} crew</span>
                <span className="ml-auto">{formatRelative(show.updatedAt)}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Link to={`/shows/${show.id}`} className="btn btn-primary btn-sm flex-1">
                  Openen
                </Link>
                <Button size="sm" variant="ghost" title="Dupliceer" onClick={() => handleDuplicate(show)}>
                  <Copy size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Archiveer"
                  onClick={async () => {
                    await api.updateShow(show.id, { archived: !show.archived });
                    await shows.reload();
                  }}
                >
                  <Archive size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Bewerk"
                  onClick={() => {
                    setEditing(show);
                    setForm({
                      name: show.name,
                      description: show.description,
                      date: show.date ?? '',
                      location: show.location,
                      isTemplate: show.isTemplate,
                      archived: show.archived,
                    });
                  }}
                >
                  <FileText size={14} />
                </Button>
                <Button size="sm" variant="ghost" title="Verwijder" onClick={() => setDeleting(show)}>
                  <Trash2 size={14} className="text-live-500" />
                </Button>
                <Link to={`/live/${show.id}`} className="btn btn-secondary btn-sm" title="Live regie">
                  <Radio size={14} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        title={templateId ? 'Nieuwe show uit template' : 'Nieuwe show'}
        onClose={() => {
          setCreateOpen(false);
          setSearchParams({});
        }}
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setCreateOpen(false);
                setSearchParams({});
              }}
            >
              Annuleren
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={!form.name.trim()}>
              {templateId ? 'Aanmaken uit template' : 'Aanmaken'}
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
              placeholder="Bijv. Musical 2027"
              autoFocus
            />
          </Field>
          <Field label="Beschrijving">
            <textarea
              className="input"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Korte omschrijving van de productie..."
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
                placeholder="Theater De Voorsteilin"
              />
            </Field>
          </div>
          {!templateId ? (
            <Toggle
              checked={form.isTemplate}
              onChange={(value) => setForm({ ...form, isTemplate: value })}
              label="Opslaan als template"
              description="Gebruik deze show later als basis voor een nieuwe productie."
            />
          ) : null}
        </div>
      </Modal>

      <Modal
        open={Boolean(editing)}
        title="Show bewerken"
        onClose={() => setEditing(null)}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Annuleren
            </Button>
            <Button variant="primary" onClick={handleSaveEdit}>
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
          <Toggle
            checked={form.isTemplate}
            onChange={(value) => setForm({ ...form, isTemplate: value })}
            label="Template"
          />
          <Toggle
            checked={form.archived}
            onChange={(value) => setForm({ ...form, archived: value })}
            label="Gearchiveerd"
            description="Gearchiveerde shows blijven bewaard maar verschijnen niet meer in de productie-selectie."
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Show verwijderen"
        message={`"${deleting?.name ?? ''}" wordt definitief verwijderd, inclusief alle scènes, cues en podiumindelingen. Dit kan niet ongedaan worden gemaakt.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />

      {toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
