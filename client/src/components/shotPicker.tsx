import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { STANDARD_SHOTS } from '../lib/utils';
import { shotCode } from '../lib/shotCodes';

/** The shots that are offered as a one-click shortcut. */
export const QUICK_SHOTS = [
  'Wide shot',
  'Medium shot',
  'Close-up',
  'Extreme close-up',
  'Over-the-shoulder',
  'Two-shot',
];

export interface ShotPickerProps {
  value: string;
  onChange: (shot: string) => void;
  /** Extra shots to offer, e.g. from the shot library. */
  extraShots?: string[];
  label?: string;
}

/**
 * Shot selector.
 *
 * Shows the most used shots as one-click chips, so the usual choice takes a
 * single click. Everything else is available through the dropdown.
 */
export function ShotPicker({ value, onChange, extraShots, label }: ShotPickerProps) {
  const [open, setOpen] = useState(false);

  const allShots = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const shot of [...QUICK_SHOTS, ...(extraShots ?? []), ...STANDARD_SHOTS]) {
      if (!seen.has(shot)) {
        seen.add(shot);
        result.push(shot);
      }
    }
    return result;
  }, [extraShots]);

  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {QUICK_SHOTS.map((shot) => (
          <button
            key={shot}
            type="button"
            onClick={() => onChange(shot)}
            title={shot}
            className={clsx(
              'flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition-colors border',
              value === shot
                ? 'bg-accent-500/15 border-accent-500/60 text-accent-700 font-semibold'
                : 'bg-base-800 border-base-600 text-base-300 hover:border-accent-400 hover:text-base-100',
            )}
          >
            <span className="font-bold tracking-wide text-[10px]">{shotCode(shot)}</span>
            {shot}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen((isOpen) => !isOpen)}
          className="px-2 py-1 rounded-md text-[11px] bg-base-800 border border-base-600 text-base-400 hover:text-base-100 transition-colors"
          title={label ?? 'Kies uit de shot library'}
        >
          <ChevronDown size={12} className="inline" /> Meer
        </button>
      </div>

      {value && !QUICK_SHOTS.includes(value) ? (
        <p className="mt-1 text-[11px] text-base-400">
          Huidige shot:{' '}
          <span className="text-base-200">
            {shotCode(value) ? <span className="font-bold text-accent-700">{shotCode(value)}</span> : null}{' '}
            {value}
          </span>
        </p>
      ) : null}

      {open ? (
        <div className="mt-1 max-h-48 overflow-y-auto rounded-md bg-base-750 border border-base-600 shadow-xl p-1">
          {allShots.map((shot) => (
            <button
              key={shot}
              type="button"
              className={clsx(
                'flex w-full items-center gap-2 text-left px-2.5 py-1.5 text-xs rounded hover:bg-base-700',
                value === shot ? 'text-accent-700 font-semibold' : 'text-base-200',
              )}
              onClick={() => {
                onChange(shot);
                setOpen(false);
              }}
            >
              <span className="font-bold tracking-wide text-[10px] w-8 shrink-0">
                {shotCode(shot)}
              </span>
              {shot}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export interface SubjectPickerProps {
  value: string;
  onChange: (subject: string) => void;
  /** The people and groups that stand on the stage. */
  subjects: string[];
  label?: string;
}

/**
 * Subject selector.
 *
 * Shows the people and groups on the stage as one-click chips, so it is easy
 * to say which actor a camera follows.
 */
export function SubjectPicker({ value, onChange, subjects, label }: SubjectPickerProps) {
  const [open, setOpen] = useState(false);

  if (!subjects.length) {
    return (
      <input
        className="input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Bijv. Emma - Hoofdrol"
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {subjects.map((subject) => (
          <button
            key={subject}
            type="button"
            onClick={() => onChange(subject)}
            className={clsx(
              'px-2 py-1 rounded-md text-[11px] transition-colors border',
              value === subject
                ? 'bg-accent-500/15 border-accent-500/60 text-accent-700 font-semibold'
                : 'bg-base-800 border-base-600 text-base-300 hover:border-accent-400 hover:text-base-100',
            )}
          >
            {subject}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen((isOpen) => !isOpen)}
          className="px-2 py-1 rounded-md text-[11px] bg-base-800 border border-base-600 text-base-400 hover:text-base-100 transition-colors"
          title={label ?? 'Typ een ander onderwerp'}
        >
          <ChevronDown size={12} className="inline" /> Meer
        </button>
      </div>

      {value && !subjects.includes(value) ? (
        <p className="mt-1 text-[11px] text-base-400">
          Volgt nu: <span className="text-base-200">{value}</span>
        </p>
      ) : null}

      {open ? (
        <div className="mt-1 rounded-md bg-base-750 border border-base-600 shadow-xl p-2">
          <input
            autoFocus
            className="input h-8 text-xs"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Bijv. Emma - Hoofdrol"
            onKeyDown={(event) => {
              if (event.key === 'Enter') setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
