import { useEffect, useState } from 'react';
import { Users, Plus, Camera, Trash2, Pencil, FileDown, Hash, Image as ImageIcon } from 'lucide-react';
import { api } from '../lib/api';
import { useAsync } from '../hooks/useApi';
import { Badge, Button, ConfirmDialog, EmptyState, Field, Loading, Modal, Panel, Toast } from '../components/ui';
import { PageHeader } from '../components/DirectorShell';
import type { Camera as CameraModel, CrewMember } from '../types';

export function CrewPage() {
  const crew = useAsync<CrewMember[]>(() => api.crew());
  const cameras = useAsync<CameraModel[]>(() => api.cameras());

  const [crewModalOpen, setCrewModalOpen] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [editingCrew, setEditingCrew] = useState<CrewMember | null>(null);
  const [editingCamera, setEditingCamera] = useState<CameraModel | null>(null);
  const [deletingCrew, setDeletingCrew] = useState<CrewMember | null>(null);
  const [deletingCamera, setDeletingCamera] = useState<CameraModel | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [crewForm, setCrewForm] = useState({ name: '', role: 'Cameraman', cameraId: '', notes: '', photoUrl: '' });
  const [cameraForm, setCameraForm] = useState({
    number: 1,
    name: '',
    type: 'Wide shot',
    color: '#3b82f6',
    notes: '',
    accessCode: '',
    lens: '',
  });

  useEffect(() => {
    if (cameraModalOpen && !editingCamera) {
      setCameraForm((prev) => ({ ...prev, number: (cameras.data?.length ?? 0) + 1 }));
    }
  }, [cameraModalOpen, editingCamera, cameras.data]);

  function openCrewModal(member?: CrewMember) {
    setEditingCrew(member ?? null);
    setCrewForm({
      name: member?.name ?? '',
      role: member?.role ?? 'Cameraman',
      cameraId: member?.cameraId ?? '',
      notes: member?.notes ?? '',
      photoUrl: member?.photoUrl ?? '',
    });
    setCrewModalOpen(true);
  }

  function openCameraModal(camera?: CameraModel) {
    setEditingCamera(camera ?? null);
    setCameraForm({
      number: camera?.number ?? (cameras.data?.length ?? 0) + 1,
      name: camera?.name ?? '',
      type: camera?.type ?? 'Wide shot',
      color: camera?.color ?? '#3b82f6',
      notes: camera?.notes ?? '',
      accessCode: camera?.accessCode ?? '',
      lens: camera?.lens ?? '',
    });
    setCameraModalOpen(true);
  }

  async function saveCrew() {
    if (!crewForm.name.trim()) return;
    try {
      const payload = {
        name: crewForm.name.trim(),
        role: crewForm.role.trim(),
        cameraId: crewForm.cameraId || null,
        notes: crewForm.notes.trim(),
        photoUrl: crewForm.photoUrl || null,
      };
      if (editingCrew) await api.updateCrew(editingCrew.id, payload);
      else await api.createCrew(payload);
      setCrewModalOpen(false);
      await crew.reload();
      setToast(editingCrew ? 'Crewlid bijgewerkt' : 'Crewlid toegevoegd');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Opslaan mislukt');
    }
  }

  async function saveCamera() {
    if (!cameraForm.name.trim()) return;
    try {
      const payload = {
        number: cameraForm.number,
        name: cameraForm.name.trim(),
        type: cameraForm.type.trim(),
        color: cameraForm.color,
        notes: cameraForm.notes.trim(),
        accessCode: cameraForm.accessCode.trim(),
        lens: cameraForm.lens.trim(),
      };
      if (editingCamera) await api.updateCamera(editingCamera.id, payload);
      else await api.createCamera(payload);
      setCameraModalOpen(false);
      await cameras.reload();
      setToast(editingCamera ? 'Camera bijgewerkt' : 'Camera toegevoegd');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Opslaan mislukt');
    }
  }

  async function uploadPhoto(file: File) {
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Kan bestand niet lezen'));
        reader.readAsDataURL(file);
      });
      const { url } = await api.uploadImage(dataUrl);
      setCrewForm((prev) => ({ ...prev, photoUrl: url }));
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Upload mislukt');
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <PageHeader
        icon={<Users size={20} />}
        title="Crew & camera's"
        description={`${crew.data?.length ?? 0} cameramensen · ${cameras.data?.length ?? 0} camera's`}
        actions={
          <>
            <Button variant="secondary" onClick={() => openCameraModal()}>
              <Camera size={16} />
              Nieuwe camera
            </Button>
            <Button variant="primary" onClick={() => openCrewModal()}>
              <Plus size={16} />
              Cameraman
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Crew */}
        <Panel
          title={
            <span className="flex items-center gap-2">
              <Users size={14} /> Cameramensen
            </span>
          }
          bodyClassName="p-3"
        >
          {crew.loading ? (
            <Loading />
          ) : crew.data?.length === 0 ? (
            <EmptyState
              icon={<Users size={26} />}
              title="Nog geen cameramensen"
              description="Voeg een cameraman toe en koppel hem aan een camera."
              action={
                <Button size="sm" variant="primary" onClick={() => openCrewModal()}>
                  <Plus size={14} /> Cameraman
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {crew.data?.map((member) => {
                const camera = cameras.data?.find((c) => c.id === member.cameraId);
                return (
                  <li
                    key={member.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-base-800"
                  >
                    {member.photoUrl ? (
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        className="w-10 h-10 rounded-full object-cover shrink-0 border border-base-600"
                      />
                    ) : (
                      <span className="grid place-items-center w-10 h-10 rounded-full bg-base-700 text-xs font-semibold shrink-0">
                        {member.name
                          .split(' ')
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      <p className="text-xs text-base-400 truncate">
                        {member.role}
                        {camera ? ` · ${camera.name}` : ' · Geen camera'}
                      </p>
                    </div>
                    {camera ? (
                      <span
                        className="grid place-items-center w-7 h-7 rounded text-xs font-bold shrink-0"
                        style={{ backgroundColor: `${camera.color}22`, color: camera.color }}
                      >
                        {camera.number}
                      </span>
                    ) : (
                      <Badge tone="neutral">Geen camera</Badge>
                    )}
                    <Button size="sm" variant="ghost" title="Bewerk" onClick={() => openCrewModal(member)}>
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Verwijder"
                      onClick={() => setDeletingCrew(member)}
                    >
                      <Trash2 size={14} className="text-live-400" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* Cameras */}
        <Panel
          title={
            <span className="flex items-center gap-2">
              <Camera size={14} /> Camera's
            </span>
          }
          bodyClassName="p-3"
        >
          {cameras.loading ? (
            <Loading />
          ) : cameras.data?.length === 0 ? (
            <EmptyState
              icon={<Camera size={26} />}
              title="Nog geen camera's"
              description="Voeg camera's toe met een eigen kleur en toegangscode."
              action={
                <Button size="sm" variant="primary" onClick={() => openCameraModal()}>
                  <Plus size={14} /> Camera
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {cameras.data?.map((camera) => {
                const operator = crew.data?.find((member) => member.cameraId === camera.id);
                return (
                  <li key={camera.id} className="rounded-lg bg-base-800 p-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="grid place-items-center w-9 h-9 rounded-md font-bold text-sm shrink-0"
                        style={{ backgroundColor: `${camera.color}22`, color: camera.color }}
                      >
                        {camera.number}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{camera.name}</p>
                        <p className="text-xs text-base-400 truncate">
                          {camera.type}
                          {camera.lens ? ` · ${camera.lens}` : ''}
                        </p>
                      </div>
                      <code className="text-xs font-mono px-2 py-1 rounded bg-base-900 border border-base-700 text-base-300">
                        {camera.accessCode}
                      </code>
                      <Button size="sm" variant="ghost" title="Bewerk" onClick={() => openCameraModal(camera)}>
                        <Pencil size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Verwijder"
                        onClick={() => setDeletingCamera(camera)}
                      >
                        <Trash2 size={14} className="text-live-400" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-base-400">
                      <span className="flex items-center gap-1">
                        <Hash size={12} />
                        {operator ? operator.name : 'Niemand toegewezen'}
                      </span>
                      {camera.notes ? (
                        <span className="truncate flex-1 text-right">{camera.notes}</span>
                      ) : null}
                      <a
                        href={`/api/export/cameras/${camera.id}/pdf`}
                        className="btn btn-ghost btn-sm"
                        title="Exporteer persoonlijke shotlist"
                      >
                        <FileDown size={13} />
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {/* Crew modal */}
      <Modal
        open={crewModalOpen}
        title={editingCrew ? 'Cameraman bewerken' : 'Nieuwe cameraman'}
        onClose={() => setCrewModalOpen(false)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCrewModalOpen(false)}>
              Annuleren
            </Button>
            <Button variant="primary" onClick={() => void saveCrew()} disabled={!crewForm.name.trim()}>
              Opslaan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Naam">
            <input
              className="input"
              value={crewForm.name}
              onChange={(event) => setCrewForm({ ...crewForm, name: event.target.value })}
              placeholder="Bijv. Sanne de Vries"
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Functie">
              <input
                className="input"
                value={crewForm.role}
                onChange={(event) => setCrewForm({ ...crewForm, role: event.target.value })}
                placeholder="Cameraman"
              />
            </Field>
            <Field label="Camera">
              <select
                className="input"
                value={crewForm.cameraId}
                onChange={(event) => setCrewForm({ ...crewForm, cameraId: event.target.value })}
              >
                <option value="">— Geen camera —</option>
                {cameras.data?.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    Camera {camera.number} — {camera.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Notities">
            <textarea
              className="input"
              value={crewForm.notes}
              onChange={(event) => setCrewForm({ ...crewForm, notes: event.target.value })}
            />
          </Field>
          <Field label="Profielfoto (optioneel)">
            <div className="flex items-center gap-3">
              {crewForm.photoUrl ? (
                <img
                  src={crewForm.photoUrl}
                  alt="Profielfoto"
                  className="w-14 h-14 rounded-full object-cover border border-base-600"
                />
              ) : (
                <span className="w-14 h-14 rounded-full bg-base-800 grid place-items-center text-base-500">
                  <ImageIcon size={20} />
                </span>
              )}
              <label className="btn btn-secondary btn-sm cursor-pointer">
                Afbeelding kiezen
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadPhoto(file);
                    event.target.value = '';
                  }}
                />
              </label>
              {crewForm.photoUrl ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCrewForm({ ...crewForm, photoUrl: '' })}
                >
                  Verwijderen
                </Button>
              ) : null}
            </div>
          </Field>
        </div>
      </Modal>

      {/* Camera modal */}
      <Modal
        open={cameraModalOpen}
        title={editingCamera ? 'Camera bewerken' : 'Nieuwe camera'}
        onClose={() => setCameraModalOpen(false)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCameraModalOpen(false)}>
              Annuleren
            </Button>
            <Button variant="primary" onClick={() => void saveCamera()} disabled={!cameraForm.name.trim()}>
              Opslaan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <Field label="Nummer">
              <input
                className="input"
                type="number"
                min={1}
                value={cameraForm.number}
                onChange={(event) =>
                  setCameraForm({ ...cameraForm, number: Number(event.target.value) })
                }
              />
            </Field>
            <Field label="Naam">
              <input
                className="input"
                value={cameraForm.name}
                onChange={(event) => setCameraForm({ ...cameraForm, name: event.target.value })}
                placeholder="Bijv. Wide shot"
                autoFocus
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cameratype">
              <input
                className="input"
                value={cameraForm.type}
                onChange={(event) => setCameraForm({ ...cameraForm, type: event.target.value })}
                placeholder="Wide shot"
              />
            </Field>
            <Field label="Lens">
              <input
                className="input"
                value={cameraForm.lens}
                onChange={(event) => setCameraForm({ ...cameraForm, lens: event.target.value })}
                placeholder="35mm"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kleurcode">
              <input
                className="input h-9 p-1"
                type="color"
                value={cameraForm.color}
                onChange={(event) => setCameraForm({ ...cameraForm, color: event.target.value })}
              />
            </Field>
            <Field label="Toegangscode" hint="De cameraman typt deze code op de iPad.">
              <input
                className="input font-mono uppercase"
                value={cameraForm.accessCode}
                onChange={(event) =>
                  setCameraForm({ ...cameraForm, accessCode: event.target.value.toUpperCase() })
                }
                placeholder="LAAT"
                maxLength={8}
              />
            </Field>
          </div>
          <Field label="Notities">
            <textarea
              className="input"
              value={cameraForm.notes}
              onChange={(event) => setCameraForm({ ...cameraForm, notes: event.target.value })}
              placeholder="Bijv. Hele podium, vaste positie in het midden."
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingCrew)}
        title="Crewlid verwijderen"
        message={`"${deletingCrew?.name ?? ''}" wordt verwijderd en uit alle shows gehaald.`}
        onConfirm={async () => {
          if (!deletingCrew) return;
          await api.deleteCrew(deletingCrew.id);
          await crew.reload();
          setDeletingCrew(null);
          setToast('Crewlid verwijderd');
        }}
        onCancel={() => setDeletingCrew(null)}
      />

      <ConfirmDialog
        open={Boolean(deletingCamera)}
        title="Camera verwijderen"
        message={`"${deletingCamera?.name ?? ''}" wordt verwijderd. Cue-instructies voor deze camera blijven bestaan maar worden niet meer getoond.`}
        onConfirm={async () => {
          if (!deletingCamera) return;
          await api.deleteCamera(deletingCamera.id);
          await cameras.reload();
          setDeletingCamera(null);
          setToast('Camera verwijderd');
        }}
        onCancel={() => setDeletingCamera(null)}
      />

      {toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
