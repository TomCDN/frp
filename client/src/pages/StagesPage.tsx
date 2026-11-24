import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Plus, Copy, Trash2, Pencil, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { useAsync } from '../hooks/useApi';
import { formatRelative } from '../lib/utils';
import { Button, ConfirmDialog, EmptyState, Field, Loading, Modal, Panel, Toast } from '../components/ui';
import { PageHeader } from '../components/DirectorShell';

export function StagesPage() {
  const stages = useAsync(() => api.stages());
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', widthCm: 1200, heightCm: 800 });

  const current = stages.data?.find((stage) => stage.id === editing) ?? null;

  async function create() {
    if (!form.name.trim()) return;
    try {
      const stage = await api.createStage({
        name: form.name.trim(),
        description: form.description.trim(),
        widthCm: form.widthCm,
        heightCm: form.heightCm,
      });
      setCreateOpen(false);
      setForm({ name: '', description: '', widthCm: 1200, heightCm: 800 });
      await stages.reload();
      window.location.href = `/stages/${stage.id}`;
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Aanmaken mislukt');
    }
  }

  async function saveEdit() {
    if (!current) return;
    try {
      await api.updateStage(current.id, {
        name: form.name.trim(),
        description: form.description.trim(),
        widthCm: form.widthCm,
        heightCm: form.heightCm,
      });
      setEditing(null);
      await stages.reload();
      setToast('Podium bijgewerkt');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Opslaan mislukt');
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <PageHeader
        icon={<Layers size={20} />}
        title="Podia"
        description={`${stages.data?.length ?? 0} opgeslagen podia`}
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            Nieuw podium
          </Button>
        }
      />

      {stages.loading ? (
        <Loading label="Podia laden..." />
      ) : stages.data?.length === 0 ? (
        <EmptyState
          icon={<Layers size={30} />}
          title="Nog geen podia"
          description="Bouw je eerste podium om cues aan te koppelen."
          action={
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus size={15} /> Nieuw podium
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stages.data?.map((stage) => (
            <Panel key={stage.id} bodyClassName="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to={`/stages/${stage.id}`}
                    className="font-semibold hover:text-accent-300 truncate block"
                  >
                    {stage.name}
                  </Link>
                  <p className="text-xs text-base-400 mt-0.5 line-clamp-2">
                    {stage.description || 'Geen beschrijving'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-base-400 mt-3">
                <span className="tabular">
                  {stage.widthCm}×{stage.heightCm} cm
                </span>
                <span>·</span>
                <span>{stage.elements.length} elementen</span>
                <span className="ml-auto">{formatRelative(stage.updatedAt)}</span>
              </div>

              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-base-700">
                <Link to={`/stages/${stage.id}`} className="btn btn-primary btn-sm flex-1">
                  Openen
                  <ArrowRight size={14} />
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Dupliceer"
                  onClick={async () => {
                    await api.duplicateStage(stage.id);
                    await stages.reload();
                    setToast('Podium gedupliceerd');
                  }}
                >
                  <Copy size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Bewerk"
                  onClick={() => {
                    setEditing(stage.id);
                    setForm({
                      name: stage.name,
                      description: stage.description,
                      widthCm: stage.widthCm,
                      heightCm: stage.heightCm,
                    });
                  }}
                >
                  <Pencil size={14} />
                </Button>
                <Button size="sm" variant="ghost" title="Verwijder" onClick={() => setDeleting(stage.id)}>
                  <Trash2 size={14} className="text-live-400" />
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        title="Nieuw podium"
        onClose={() => setCreateOpen(false)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Annuleren
            </Button>
            <Button variant="primary" onClick={() => void create()} disabled={!form.name.trim()}>
              Aanmaken
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Naam">
            <input
              className="input"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Bijv. Grote zaal"
              autoFocus
            />
          </Field>
          <Field label="Beschrijving">
            <textarea
              className="input"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Breedte (cm)">
              <input
                className="input"
                type="number"
                min={200}
                step={10}
                value={form.widthCm}
                onChange={(event) => setForm({ ...form, widthCm: Number(event.target.value) })}
              />
            </Field>
            <Field label="Diepte (cm)">
              <input
                className="input"
                type="number"
                min={200}
                step={10}
                value={form.heightCm}
                onChange={(event) => setForm({ ...form, heightCm: Number(event.target.value) })}
              />
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(current)}
        title="Podium bewerken"
        onClose={() => setEditing(null)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Annuleren
            </Button>
            <Button variant="primary" onClick={() => void saveEdit()}>
              Opslaan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Naam">
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Breedte (cm)">
              <input
                className="input"
                type="number"
                min={200}
                step={10}
                value={form.widthCm}
                onChange={(event) => setForm({ ...form, widthCm: Number(event.target.value) })}
              />
            </Field>
            <Field label="Diepte (cm)">
              <input
                className="input"
                type="number"
                min={200}
                step={10}
                value={form.heightCm}
                onChange={(event) => setForm({ ...form, heightCm: Number(event.target.value) })}
              />
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Podium verwijderen"
        message="Dit podium wordt definitief verwijderd. Cues die hiervan gebruikmaken blijven bestaan, maar verliezen hun podium."
        onConfirm={async () => {
          if (!deleting) return;
          await api.deleteStage(deleting);
          await stages.reload();
          setDeleting(null);
          setToast('Podium verwijderd');
        }}
        onCancel={() => setDeleting(null)}
      />

      {toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
