import clsx, { type ClassValue } from 'clsx';

/** Formats seconds as mm:ss or hh:mm:ss depending on the show setting. */
export function formatTimecode(seconds: number | null | undefined, format: 'hh:mm:ss' | 'mm:ss' | 'seconds'): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return '--:--';
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (format === 'seconds') return `${total}s`;
  if (format === 'hh:mm:ss') return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

/** Formats a duration in a human readable way. */
export function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`;
}

/** Formats an ISO date as a readable Dutch date. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Formats a timestamp as a relative time ("3 min geleden"). */
export function formatRelative(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'zojuist';
  if (minutes < 60) return `${minutes} min geleden`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} dagen geleden`;
  return formatDate(value);
}

/** Formats a timestamp as a clock time. */
export function formatClock(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export { clsx };
export type { ClassValue };

/** Converts a hex colour to an rgba() string with the given alpha. */
export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return `rgba(37, 99, 235, ${alpha})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Returns a readable label for a camera element type. */
export const ELEMENT_LABELS: Record<string, string> = {
  floor: 'Podiumvloer',
  platform: 'Podium / verhoging',
  backdrop: 'Achtergrond',
  stairs: 'Trappen',
  door: 'Deur',
  table: 'Meubel',
  chair: 'Stoel',
  microphone: 'Microfoon',
  instrument: 'Instrument',
  light: 'Lichtpositie',
  marker: 'Markering',
  person: 'Persoon',
  group: 'Groep',
  camera: 'Camerapositie',
  label: 'Tekstlabel',
};

export const LAYER_LABELS: Record<string, string> = {
  floor: 'Vloer',
  scenery: 'Decor',
  people: 'Personen',
  lighting: 'Licht',
  cameras: 'Camera’s',
  overlay: 'Overlay',
};

/** Standard shots offered in the shot library. */
export const STANDARD_SHOTS = [
  'Wide shot',
  'Medium shot',
  'Close-up',
  'Extreme close-up',
  'Over-the-shoulder',
  'Tracking shot',
  'Pan',
  'Tilt',
  'Static shot',
  'Two-shot',
];

/** Standard camera movements offered in the cue editor. */
export const MOVEMENTS = [
  'Statisch',
  'Pan',
  'Tilt',
  'Slow push in',
  'Pull out',
  'Dolly',
  'Cirkelbeweging',
  'Handheld',
  'Volgbeweging',
];
