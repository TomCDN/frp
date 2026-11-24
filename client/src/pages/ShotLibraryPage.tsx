import { useState } from 'react';
import { Sparkles, Plus, Trash2, Camera } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../lib/api';
import { useAsync } from '../hooks/useApi';
import { Badge, Button, EmptyState, Field, Loading, Modal, Panel, Toast } from '../components/ui';
import { PageHeader } from '../components/DirectorShell';
import type { ShotTemplate } from '../types';

/** Simple schematic illustrations for each standard shot. */
function ShotIcon({ icon, className }: { icon: string; className?: string }) {
  const stroke = 'currentColor';
  const common = {
    fill: 'none',
    stroke,
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (icon) {
    case 'wide':
      return (
        <svg viewBox="0 0 48 32" className={className} {...common}>
          <rect x="4" y="6" width="40" height="20" rx="2" />
          <circle cx="16" cy="14" r="3" />
          <circle cx="26" cy="14" r="3" />
          <circle cx="36" cy="14" r="3" />
          <path d="M4 26h40" strokeDasharray="2 2" />
        </svg>
      );
    case 'medium':
      return (
        <svg viewBox="0 0 48 32" className={className} {...common}>
          <rect x="4" y="6" width="40" height="20" rx="2" />
          <circle cx="24" cy="13" r="4" />
          <path d="M16 26c0-4.5 3.6-7 8-7s8 2.5 8 7" />
        </svg>
      );
    case 'close':
      return (
        <svg viewBox="0 0 48 32" className={className} {...common}>
          <rect x="4" y="6" width="40" height="20" rx="2" />
          <circle cx="24" cy="16" r="7" />
          <path d="M21 13.5h.01M27 13.5h.01" strokeWidth={2.5} />
          <path d="M21 19c1.8 1.2 4.2 1.2 6 0" />
        </svg>
      );
    case 'ecu':
      return (
        <svg viewBox="0 0 48 32" className={className} {...common}>
          <rect x="4" y="6" width="40" height="20" rx="2" />
          <circle cx="24" cy="16" r="5" />
          <path d="M21.5 14.5h.01M26.5 14.5h.01" strokeWidth={3} />
        </svg>
      );
    case 'ots':
      return (
        <svg viewBox="0 0 48 32" className={className} {...common}>
          <rect x="4" y="6" width="40" height="20" rx="2" />
          <path d="M14 26V16a4 4 0 0 1 4-4h12v14" />
          <circle cx="31" cy="13" r="3.5" />
        </svg>
      );
    case 'tracking':
      return (
        <svg viewBox="0 0 48 32" className={className} {...common}>
          <rect x="4" y="6" width="40" height="20" rx="2" />
          <path d="M6 24c6-12 12-12 18 0s12 12 18 0" strokeDasharray="3 2" />
          <circle cx="24" cy="16" r="3" />
        </svg>
      );
    case 'pan':
      return (
        <svg viewBox="0 0 48 32" className={className} {...common}>
          <rect x="4" y="6" width="40" height="20" rx="2" />
          <path d="M10 22h20" strokeDasharray="3 2" />
          <path d="M28 19l4 3-4 3" />
          <circle cx="36" cy="16" r="3" />
        </svg>
      );
    case 'tilt':
      return (
        <svg viewBox="0 0 48 32" className={className} {...common}>
          <rect x="4" y="6" width="40" height="20" rx="2" />
          <path d="M16 24V12" strokeDasharray="3 2" />
          <path d="M13 15l3-3 3 3" />
          <circle cx="16" cy="9" r="3" />
        </svg>
      );
    case 'static':
      return (
        <svg viewBox="0 0 48 32" className={className} {...common}>
          <rect x="4" y="6" width="40" height="20" rx="2" />
          <circle cx="20" cy="16" r="3" />
          <circle cx="30" cy="16" r="3" />
          <path d="M24 10v12" strokeDasharray="2 3" />
        </svg>
      );
    case 'two':
      return (
        <svg viewBox="0 0 48 32" className={className} {...common}>
          <rect x="4" y="6" width="40" height="20" rx="2" />
          <circle cx="17" cy="14" r="3.5" />
          <path d="M11 26c0-4 2.7-6 6-6s6 2 6 6" />
          <circle cx="31" cy="14" r="3.5" />
          <path d="M25 26c0-4 2.7-6 6-6s6 2 6 6" />
        </svg>
      );
    case 'crane':
      return (
        <svg viewBox="0 0 48 32" className={className} {...common}>
          <rect x="4" y="6" width="40" height="20" rx="2" />
          <path d="M24 26V12M24 12h8" />
          <path d="M32 12l3 4h-6z" />
        </svg>
      );
    case 'dutch':
      return (
        <svg viewBox="0 0 48 32" className={className} {...common}>
          <rect x="4" y="6" width="40" height="20" rx="2" transform="rotate(-10 24 16)" />
          <circle cx="24" cy="16" r="4" transform="rotate(-10 24 16)" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 48 32" className={className} {...common}>
          <rect x="4" y="6" width="40" height="20" rx="2" />
          <circle cx="24" cy="16" r="5" />
        </svg>
      );
  }
}

export function ShotLibraryPage() {
  const shots = useAsync<ShotTemplate[]>(() => api.shotTemplates());
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', movement: '', icon: 'camera' });
  const [toast, setToast] = useState<string | null>(null);

  const icons = [
    'wide',
    'medium',
    'close',
    'ecu',
    'ots',
    'tracking',
    'pan',
    'tilt',
    'static',
    'two',
    'crane',
    'dutch',
    'camera',
  ];

  async function create() {
    if (!form.name.trim()) return;
    try {
      await api.createShotTemplate({
        name: form.name.trim(),
        description: form.description.trim(),
        movement: form.movement.trim(),
        icon: form.icon,
      });
      setModalOpen(false);
      setForm({ name: '', description: '', movement: '', icon: 'camera' });
      await shots.reload();
      setToast('Shot toegevoegd aan de bibliotheek');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Opslaan mislukt');
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      <PageHeader
        icon={<Sparkles size={20} />}
        title="Shot library"
        description="Standaard shots met illustratie en beschrijving, één klik toewijbaar aan een camera"
        actions={
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} />
            Eigen shot
          </Button>
        }
      />

      {shots.loading ? (
        <Loading label="Shot library laden..." />
      ) : shots.data?.length === 0 ? (
        <EmptyState
          icon={<Camera size={30} />}
          title="Shot library is leeg"
          description="Voeg eigen shots toe met een beschrijving en bewegingsinstructie."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shots.data?.map((shot) => (
            <Panel key={shot.id} bodyClassName="p-4">
              <div className="flex items-start justify-between gap-2">
                <div
                  className={clsx(
                    'grid place-items-center w-full h-20 rounded-lg bg-base-900 border border-base-700 mb-3',
                    'text-accent-700',
                  )}
                >
                  <ShotIcon icon={shot.icon} className="w-24 h-16" />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Verwijder"
                  onClick={async () => {
                    await api.deleteShotTemplate(shot.id);
                    await shots.reload();
                  }}
                >
                  <Trash2 size={13} className="text-live-500" />
                </Button>
              </div>
              <h3 className="font-semibold text-sm">{shot.name}</h3>
              <p className="text-xs text-base-400 mt-1 leading-relaxed min-h-[2.5rem]">
                {shot.description || 'Geen beschrijving.'}
              </p>
              {shot.movement ? (
                <div className="mt-2">
                  <Badge tone="accent">{shot.movement}</Badge>
                </div>
              ) : null}
            </Panel>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title="Eigen shot toevoegen"
        onClose={() => setModalOpen(false)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Annuleren
            </Button>
            <Button variant="primary" onClick={() => void create()} disabled={!form.name.trim()}>
              Toevoegen
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
              placeholder="Bijv. Dutch angle"
              autoFocus
            />
          </Field>
          <Field label="Beschrijving">
            <textarea
              className="input"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Wat zien we in dit shot?"
            />
          </Field>
          <Field label="Bewegingsinstructie">
            <input
              className="input"
              value={form.movement}
              onChange={(event) => setForm({ ...form, movement: event.target.value })}
              placeholder="Bijv. Statisch"
            />
          </Field>
          <Field label="Illustratie">
            <div className="grid grid-cols-7 gap-1.5">
              {icons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm({ ...form, icon })}
                  className={clsx(
                    'grid place-items-center aspect-square rounded-md border transition-colors',
                    form.icon === icon
                      ? 'border-accent-400 bg-accent-500/15 text-accent-700'
                      : 'border-base-700 bg-base-900 text-base-400 hover:border-base-600',
                  )}
                >
                  <ShotIcon icon={icon} className="w-7 h-6" />
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Modal>

      {toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
