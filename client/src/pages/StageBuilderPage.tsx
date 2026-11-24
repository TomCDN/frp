import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Trash2,
  Copy,
  Save,
  Undo2,
  Redo2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Group,
  ZoomIn,
  ZoomOut,
  Maximize,
  Square,
  Circle as CircleIcon,
  Camera,
  Sun,
  Type,
  PersonStanding,
  Users,
  Grid3x3,
  RotateCw,
} from 'lucide-react';
import type Konva from 'konva';
import { api } from '../lib/api';
import { useElementSize } from '../hooks/useElementSize';
import {
  BASE_SCALE,
  DEFAULT_COLORS,
  GRID_SIZE,
  LAYER_ORDER,
  createElement,
  elementColor,
  snap,
} from '../lib/stageGeometry';
import { ELEMENT_LABELS, LAYER_LABELS } from '../lib/utils';
import { Button, EmptyState, Field, Loading, Modal, Toast } from '../components/ui';
import { StageCanvas } from '../components/StageCanvas';
import type { Stage, StageElement, StageElementType, StageLayer } from '../types';

/** Element types offered in the palette. */
const PALETTE: Array<{ type: StageElementType; icon: typeof Square; group: StageLayer }> = [
  { type: 'platform', icon: Square, group: 'scenery' },
  { type: 'backdrop', icon: Square, group: 'scenery' },
  { type: 'stairs', icon: Square, group: 'scenery' },
  { type: 'door', icon: Square, group: 'scenery' },
  { type: 'table', icon: Square, group: 'scenery' },
  { type: 'chair', icon: Square, group: 'scenery' },
  { type: 'microphone', icon: CircleIcon, group: 'scenery' },
  { type: 'instrument', icon: CircleIcon, group: 'scenery' },
  { type: 'light', icon: Sun, group: 'lighting' },
  { type: 'marker', icon: Grid3x3, group: 'overlay' },
  { type: 'person', icon: PersonStanding, group: 'people' },
  { type: 'group', icon: Users, group: 'people' },
  { type: 'camera', icon: Camera, group: 'cameras' },
  { type: 'label', icon: Type, group: 'overlay' },
];

interface HistoryEntry {
  elements: StageElement[];
}

export function StageBuilderPage() {
  const { stageId = '' } = useParams();

  const [stage, setStage] = useState<Stage | null>(null);
  const [elements, setElements] = useState<StageElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [stageForm, setStageForm] = useState({
    name: '',
    description: '',
    widthCm: 1200,
    heightCm: 800,
    depthCm: 200,
  });

  const { ref: canvasRef, size } = useElementSize<HTMLDivElement>();
  const konvaRef = useRef<Konva.Stage>(null);
  const skipHistory = useRef(false);

  /* ------------------------------ Load ----------------------------- */

  useEffect(() => {
    let cancelled = false;
    api
      .stage(stageId)
      .then((result) => {
        if (cancelled) return;
        setStage(result);
        setElements(result.elements);
        setStageForm({
          name: result.name,
          description: result.description,
          widthCm: result.widthCm,
          heightCm: result.heightCm,
          depthCm: result.depthCm,
        });
      })
      .catch((error) => {
        if (!cancelled) setToast(error instanceof Error ? error.message : 'Laden mislukt');
      });
    return () => {
      cancelled = true;
    };
  }, [stageId]);

  /* --------------------------- History ----------------------------- */

  const pushHistory = useCallback((next: StageElement[]) => {
    if (skipHistory.current) {
      skipHistory.current = false;
      return;
    }
    setHistory((prev) => [...prev.slice(-49), { elements: next }]);
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      setFuture((f) => [...f, { elements }]);
      setElements(last.elements);
      setDirty(true);
      skipHistory.current = true;
      return prev.slice(0, -1);
    });
  }, [elements]);

  const redo = useCallback(() => {
    setFuture((prev) => {
      if (!prev.length) return prev;
      const next = prev[prev.length - 1];
      setHistory((h) => [...h, { elements }]);
      setElements(next.elements);
      setDirty(true);
      skipHistory.current = true;
      return prev.slice(0, -1);
    });
  }, [elements]);

  /* --------------------------- Mutations --------------------------- */

  const commit = useCallback(
    (next: StageElement[]) => {
      pushHistory(elements);
      setElements(next);
      setDirty(true);
    },
    [elements, pushHistory],
  );

  const addElement = useCallback(
    (type: StageElementType) => {
      if (!stage) return;
      const centerX = Math.round(stage.widthCm / 2);
      const centerY = Math.round(stage.heightCm / 2);
      const element = createElement(type, centerX, centerY, {
        name: ELEMENT_LABELS[type] ?? 'Element',
        props: { color: DEFAULT_COLORS[type] },
      });
      if (type === 'camera') {
        element.props.cameraNumber =
          stage.elements.filter((e) => e.type === 'camera').length + 1;
      }
      commit([...elements, element]);
      setSelectedId(element.id);
    },
    [stage, elements, commit],
  );

  const updateElement = useCallback(
    (id: string, patch: Partial<StageElement>) => {
      const next = elements.map((element) => (element.id === id ? { ...element, ...patch } : element));
      commit(next);
    },
    [elements, commit],
  );

  const removeElement = useCallback(
    (id: string) => {
      commit(elements.filter((element) => element.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [elements, commit, selectedId],
  );

  const duplicateElement = useCallback(
    (id: string) => {
      const source = elements.find((element) => element.id === id);
      if (!source) return;
      const copy: StageElement = {
        ...source,
        id: `el-${Math.random().toString(36).slice(2, 10)}`,
        name: `${source.name} (kopie)`,
        x: source.x + 40,
        y: source.y + 40,
      };
      commit([...elements, copy]);
      setSelectedId(copy.id);
    },
    [elements, commit],
  );

  const groupSelected = useCallback(() => {
    if (!selectedId) return;
    const groupId = `grp-${Math.random().toString(36).slice(2, 8)}`;
    commit(elements.map((element) => (element.id === selectedId ? { ...element, groupId } : element)));
    setToast('Element gegroepeerd');
  }, [elements, commit, selectedId]);

  const ungroupSelected = useCallback(() => {
    if (!selectedId) return;
    commit(elements.map((element) => (element.id === selectedId ? { ...element, groupId: null } : element)));
  }, [elements, commit, selectedId]);

  /* ------------------------------ Save ----------------------------- */

  const save = useCallback(async () => {
    if (!stage) return;
    setSaving(true);
    try {
      const updated = await api.updateStage(stage.id, {
        name: stage.name,
        description: stage.description,
        widthCm: stage.widthCm,
        heightCm: stage.heightCm,
        depthCm: stage.depthCm,
        elements,
      });
      setStage(updated);
      setElements(updated.elements);
      setDirty(false);
      setToast('Podium opgeslagen');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  }, [stage, elements]);

  // Autosave after 20 seconds of inactivity when there are unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      void save();
    }, 20000);
    return () => window.clearTimeout(timer);
  }, [dirty, save]);

  /* ---------------------------- Rendering --------------------------- */

  const scale = useMemo(() => {
    if (!stage || !size.width) return BASE_SCALE;
    const available = size.width - 40;
    return Math.max(0.1, Math.min(1.2, available / stage.widthCm)) * zoom;
  }, [stage, size.width, zoom]);

  const selected = useMemo(
    () => elements.find((element) => element.id === selectedId) ?? null,
    [elements, selectedId],
  );

  // Keyboard shortcuts.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedId) {
          event.preventDefault();
          removeElement(selectedId);
        }
        return;
      }
      if (event.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, removeElement, undo, redo]);

  if (!stage) {
    return (
      <div className="p-6">
        <Loading label="Podium laden..." />
      </div>
    );
  }

  const groupedSelected = selected?.groupId ?? null;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-base-700 bg-base-900 shrink-0">
        <Link
          to="/stages"
          className="inline-flex items-center gap-1.5 text-xs text-base-400 hover:text-base-200 mr-1"
        >
          <ArrowLeft size={14} /> Podia
        </Link>

        <input
          className="input h-8 py-1 text-sm font-medium w-56"
          value={stage.name}
          onChange={(event) => {
            setStage({ ...stage, name: event.target.value });
            setDirty(true);
          }}
        />

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={undo}
            disabled={!history.length}
            title="Ongedaan maken (Ctrl+Z)"
          >
            <Undo2 size={15} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={redo}
            disabled={!future.length}
            title="Opnieuw (Ctrl+Shift+Z)"
          >
            <Redo2 size={15} />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.15))}
            title="Uitzoomen"
          >
            <ZoomOut size={15} />
          </Button>
          <span className="text-xs text-base-400 tabular w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
            title="Inzoomen"
          >
            <ZoomIn size={15} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setZoom(1)} title="Volledig scherm">
            <Maximize size={15} />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={showGrid ? 'secondary' : 'ghost'}
            onClick={() => setShowGrid((value) => !value)}
            title="Raster"
          >
            <Grid3x3 size={15} />
          </Button>
          <Button
            size="sm"
            variant={snapToGrid ? 'secondary' : 'ghost'}
            onClick={() => setSnapToGrid((value) => !value)}
            title="Vastklikken op raster"
          >
            <RotateCw size={15} />
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {dirty ? <span className="text-xs text-signal-300">Niet opgeslagen</span> : null}
          <Button size="sm" variant="secondary" onClick={() => setStageModalOpen(true)}>
            Podium
          </Button>
          <Button size="sm" variant="primary" onClick={() => void save()} disabled={saving}>
            <Save size={15} />
            {saving ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid lg:grid-cols-[220px_1fr_280px]">
        {/* Palette */}
        <aside className="border-r border-base-700 bg-base-900 overflow-y-auto p-3 hidden lg:block">
          <p className="kicker mb-2">Elementen</p>
          {LAYER_ORDER.map((layer) => {
            const items = PALETTE.filter((item) => item.group === layer);
            if (!items.length) return null;
            return (
              <div key={layer} className="mb-3">
                <p className="text-[10px] uppercase tracking-wider text-base-500 mb-1">
                  {LAYER_LABELS[layer]}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {items.map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => addElement(item.type)}
                      className="flex flex-col items-center gap-1 px-1 py-2 rounded-md bg-base-800 hover:bg-base-700 text-[10px] leading-tight text-center transition-colors"
                    >
                      <item.icon size={16} className="text-accent-300" />
                      {ELEMENT_LABELS[item.type]}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </aside>

        {/* Canvas */}
        <div ref={canvasRef} className="relative min-h-0 bg-base-950 overflow-hidden">
          {size.width > 0 ? (
            <StageCanvas
              stage={stage}
              elements={elements}
              scale={scale}
              width={size.width}
              height={size.height}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onChange={(id, patch) => {
                const next = elements.map((element) =>
                  element.id === id
                    ? {
                        ...element,
                        ...patch,
                        x: snapToGrid && patch.x !== undefined ? snap(patch.x) : (patch.x ?? element.x),
                        y: snapToGrid && patch.y !== undefined ? snap(patch.y) : (patch.y ?? element.y),
                      }
                    : element,
                );
                commit(next);
              }}
              showGrid={showGrid}
              showCameraDirections
              stageRef={konvaRef}
            />
          ) : null}

          {/* Mobile / tablet palette */}
          <div className="lg:hidden absolute bottom-0 left-0 right-0 bg-base-900/95 border-t border-base-700 p-2 flex gap-1.5 overflow-x-auto">
            {PALETTE.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => addElement(item.type)}
                className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-md bg-base-800 text-[9px] whitespace-nowrap"
              >
                <item.icon size={14} className="text-accent-300" />
                {ELEMENT_LABELS[item.type]}
              </button>
            ))}
          </div>
        </div>

        {/* Inspector */}
        <aside className="border-l border-base-700 bg-base-900 overflow-y-auto p-3">
          <p className="kicker mb-2">Eigenschappen</p>
          {!selected ? (
            <EmptyState
              icon={<Square size={24} />}
              title="Niets geselecteerd"
              description="Klik op een element in het podium om het te bewerken."
            />
          ) : (
            <div className="space-y-3">
              <Field label="Naam">
                <input
                  className="input"
                  value={selected.name}
                  onChange={(event) => updateElement(selected.id, { name: event.target.value })}
                />
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="X (cm)">
                  <input
                    className="input"
                    type="number"
                    value={Math.round(selected.x)}
                    onChange={(event) =>
                      updateElement(selected.id, { x: Number(event.target.value) })
                    }
                  />
                </Field>
                <Field label="Y (cm)">
                  <input
                    className="input"
                    type="number"
                    value={Math.round(selected.y)}
                    onChange={(event) =>
                      updateElement(selected.id, { y: Number(event.target.value) })
                    }
                  />
                </Field>
                <Field label="Breedte">
                  <input
                    className="input"
                    type="number"
                    value={Math.round(selected.width)}
                    onChange={(event) =>
                      updateElement(selected.id, { width: Number(event.target.value) })
                    }
                  />
                </Field>
                <Field label="Hoogte">
                  <input
                    className="input"
                    type="number"
                    value={Math.round(selected.height)}
                    onChange={(event) =>
                      updateElement(selected.id, { height: Number(event.target.value) })
                    }
                  />
                </Field>
              </div>

              <Field label="Rotatie (°)">
                <input
                  className="input"
                  type="number"
                  value={Math.round(selected.rotation)}
                  onChange={(event) =>
                    updateElement(selected.id, { rotation: Number(event.target.value) })
                  }
                />
              </Field>

              <Field label="Kleur">
                <div className="flex items-center gap-2">
                  <input
                    className="input h-9 p-1 w-14 shrink-0"
                    type="color"
                    value={elementColor(selected)}
                    onChange={(event) =>
                      updateElement(selected.id, {
                        props: { ...selected.props, color: event.target.value },
                      })
                    }
                  />
                  <input
                    className="input flex-1"
                    value={elementColor(selected)}
                    onChange={(event) =>
                      updateElement(selected.id, {
                        props: { ...selected.props, color: event.target.value },
                      })
                    }
                  />
                </div>
              </Field>

              {selected.type === 'person' || selected.type === 'group' ? (
                <Field label="Aantal personen" hint="Voor groepen wordt dit aantal getekend.">
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={Number(selected.props?.count ?? 1)}
                    onChange={(event) =>
                      updateElement(selected.id, {
                        props: { ...selected.props, count: Number(event.target.value) },
                      })
                    }
                  />
                </Field>
              ) : null}

              {selected.type === 'camera' ? (
                <Field label="Kijkrichting (°)" hint="0 = rechts, 90 = naar het publiek toe.">
                  <input
                    className="input"
                    type="number"
                    value={Number(selected.props?.direction ?? 270)}
                    onChange={(event) =>
                      updateElement(selected.id, {
                        props: { ...selected.props, direction: Number(event.target.value) },
                      })
                    }
                  />
                </Field>
              ) : null}

              {selected.type === 'label' ? (
                <Field label="Tekst">
                  <input
                    className="input"
                    value={String(selected.props?.text ?? '')}
                    onChange={(event) =>
                      updateElement(selected.id, {
                        props: { ...selected.props, text: event.target.value },
                      })
                    }
                  />
                </Field>
              ) : null}

              <Field label="Laag">
                <select
                  className="input"
                  value={selected.layer}
                  onChange={(event) =>
                    updateElement(selected.id, { layer: event.target.value as StageLayer })
                  }
                >
                  {LAYER_ORDER.map((layer) => (
                    <option key={layer} value={layer}>
                      {LAYER_LABELS[layer]}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => updateElement(selected.id, { locked: !selected.locked })}
                >
                  {selected.locked ? <Lock size={13} /> : <Unlock size={13} />}
                  {selected.locked ? 'Ontgrendelen' : 'Vergrendelen'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => updateElement(selected.id, { visible: !selected.visible })}
                >
                  {selected.visible ? <EyeOff size={13} /> : <Eye size={13} />}
                  {selected.visible ? 'Verbergen' : 'Tonen'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => duplicateElement(selected.id)}>
                  <Copy size={13} />
                </Button>
                {groupedSelected ? (
                  <Button size="sm" variant="secondary" onClick={ungroupSelected}>
                    <Group size={13} />
                    Losmaken
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={groupSelected}>
                    <Group size={13} />
                    Groeperen
                  </Button>
                )}
                <Button size="sm" variant="danger" onClick={() => removeElement(selected.id)}>
                  <Trash2 size={13} />
                </Button>
              </div>

              {selected.locked ? (
                <p className="text-[11px] text-signal-300">Vergrendeld — kan niet worden verplaatst.</p>
              ) : null}
            </div>
          )}

          <div className="mt-6">
            <p className="kicker mb-2">Lagen</p>
            <div className="space-y-1">
              {LAYER_ORDER.map((layer) => {
                const count = elements.filter((element) => element.layer === layer).length;
                return (
                  <div
                    key={layer}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-base-850 text-xs"
                  >
                    <span className="text-base-300">{LAYER_LABELS[layer]}</span>
                    <span className="text-base-500 tabular">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* Stage settings modal */}
      <Modal
        open={stageModalOpen}
        title="Podium instellingen"
        onClose={() => setStageModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setStageModalOpen(false)}>
              Annuleren
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setStage({
                  ...stage,
                  name: stageForm.name,
                  description: stageForm.description,
                  widthCm: stageForm.widthCm,
                  heightCm: stageForm.heightCm,
                  depthCm: stageForm.depthCm,
                });
                setDirty(true);
                setStageModalOpen(false);
              }}
            >
              Toepassen
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Naam">
            <input
              className="input"
              value={stageForm.name}
              onChange={(event) => setStageForm({ ...stageForm, name: event.target.value })}
            />
          </Field>
          <Field label="Beschrijving">
            <textarea
              className="input"
              value={stageForm.description}
              onChange={(event) => setStageForm({ ...stageForm, description: event.target.value })}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Breedte (cm)">
              <input
                className="input"
                type="number"
                min={200}
                step={10}
                value={stageForm.widthCm}
                onChange={(event) =>
                  setStageForm({ ...stageForm, widthCm: Number(event.target.value) })
                }
              />
            </Field>
            <Field label="Diepte (cm)">
              <input
                className="input"
                type="number"
                min={200}
                step={10}
                value={stageForm.heightCm}
                onChange={(event) =>
                  setStageForm({ ...stageForm, heightCm: Number(event.target.value) })
                }
              />
            </Field>
            <Field label="Toneelhoogte (cm)">
              <input
                className="input"
                type="number"
                min={0}
                step={10}
                value={stageForm.depthCm}
                onChange={(event) =>
                  setStageForm({ ...stageForm, depthCm: Number(event.target.value) })
                }
              />
            </Field>
          </div>
          <p className="text-xs text-base-500">
            Standaard raster: {GRID_SIZE} cm. Elementen worden automatisch op het raster geplaatst wanneer
            vastklikken aanstaat.
          </p>
        </div>
      </Modal>

      {toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
