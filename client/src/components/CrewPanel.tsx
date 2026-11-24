import { useEffect, useState } from 'react';
import { Users, Camera, UserCheck, UserX } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../lib/api';
import { Badge, Button, EmptyState, Panel } from './ui';
import type { Camera as CameraModel, CrewMember } from '../types';

export function CrewPanel({
  showId,
  crew,
  cameras,
  onToast,
}: {
  showId: string;
  crew: CrewMember[];
  cameras: CameraModel[];
  onToast: (message: string) => void;
}) {
  const [assigned, setAssigned] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .showCrew(showId)
      .then((ids) => {
        if (!cancelled) setAssigned(ids);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showId]);

  async function toggle(crewId: string) {
    const next = assigned.includes(crewId)
      ? assigned.filter((id) => id !== crewId)
      : [...assigned, crewId];
    setAssigned(next);
    try {
      await api.setShowCrew(showId, next);
    } catch (error) {
      setAssigned(assigned);
      onToast(error instanceof Error ? error.message : 'Opslaan mislukt');
    }
  }

  const assignedCameras = new Set(
    crew.filter((member) => assigned.includes(member.id) && member.cameraId).map((member) => member.cameraId),
  );

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel
        title={
          <span className="flex items-center gap-2">
            <Users size={14} /> Cameracrew
          </span>
        }
        actions={<Badge tone="accent">{assigned.length} toegevoegd</Badge>}
        bodyClassName="p-3"
      >
        {loading ? (
          <p className="text-sm text-base-400 p-3">Laden...</p>
        ) : crew.length === 0 ? (
          <EmptyState
            icon={<Users size={26} />}
            title="Geen cameramensen"
            description="Voeg cameramensen toe via de crew-pagina."
          />
        ) : (
          <ul className="space-y-2">
            {crew.map((member) => {
              const camera = cameras.find((c) => c.id === member.cameraId);
              const isAssigned = assigned.includes(member.id);
              return (
                <li
                  key={member.id}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors',
                    isAssigned ? 'bg-base-800 border-base-600' : 'bg-base-850 border-base-700',
                  )}
                >
                  <span className="grid place-items-center w-9 h-9 rounded-full bg-base-700 text-xs font-semibold shrink-0">
                    {member.name
                      .split(' ')
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-base-400 truncate">
                      {member.role}
                      {camera ? ` · ${camera.name}` : ''}
                    </p>
                  </div>
                  {camera ? (
                    <span
                      className="grid place-items-center w-6 h-6 rounded text-[11px] font-bold shrink-0"
                      style={{ backgroundColor: `${camera.color}22`, color: camera.color }}
                      title={camera.name}
                    >
                      {camera.number}
                    </span>
                  ) : null}
                  <Button
                    size="sm"
                    variant={isAssigned ? 'primary' : 'secondary'}
                    onClick={() => void toggle(member.id)}
                    title={isAssigned ? 'Verwijder uit deze show' : 'Toevoegen aan deze show'}
                  >
                    {isAssigned ? <UserCheck size={14} /> : <UserX size={14} />}
                    {isAssigned ? 'Toegevoegd' : 'Toevoegen'}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel
        title={
          <span className="flex items-center gap-2">
            <Camera size={14} /> Camera-indeling
          </span>
        }
        bodyClassName="p-3"
      >
        {cameras.length === 0 ? (
          <EmptyState
            icon={<Camera size={26} />}
            title="Geen camera's"
            description="Voeg camera's toe via de crew-pagina."
          />
        ) : (
          <ul className="space-y-2">
            {cameras.map((camera) => {
              const operator = crew.find((member) => member.cameraId === camera.id);
              const used = assignedCameras.has(camera.id);
              return (
                <li
                  key={camera.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-base-800"
                >
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
                      {operator ? ` · ${operator.name}` : ' · Geen operator'}
                    </p>
                  </div>
                  <code className="text-xs font-mono px-2 py-1 rounded bg-base-900 border border-base-700 text-base-300">
                    {camera.accessCode}
                  </code>
                  {used ? <Badge tone="go">In gebruik</Badge> : null}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-base-500 mt-3 px-1">
          De toegangscode gebruikt de cameraman op de iPad om zich aan zijn camera te koppelen.
        </p>
      </Panel>
    </div>
  );
}
