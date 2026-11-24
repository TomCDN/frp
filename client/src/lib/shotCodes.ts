/**
 * The shot codes from the "Camerahandboek".
 *
 * The handbook teaches the camera operators a short code for every shot, so
 * they can be told what to film in one word. The codes are shown next to the
 * shot everywhere in FEY, so the director and the operators speak the same
 * language.
 */
export interface ShotCode {
  /** The short code, e.g. "WS". */
  code: string;
  /** The full name of the shot. */
  name: string;
  /** A one line explanation, as used in the handbook. */
  hint: string;
}

/** The shots the handbook explains, in the order of the handbook. */
export const HANDBOOK_SHOTS: ShotCode[] = [
  {
    code: 'WS',
    name: 'Wide shot',
    hint: 'Het hele podium in beeld. Het veilige beeld waar de regie op terug kan vallen.',
  },
  {
    code: 'MS',
    name: 'Medium shot',
    hint: 'Eén kind (of klein groepje) tot en met het hoofd. Je ziet het gezicht én de armen.',
  },
  {
    code: 'CU',
    name: 'Close-up',
    hint: 'Hoofd en schouders. Hierin zie je emotie.',
  },
  {
    code: '2S',
    name: 'Two-shot',
    hint: 'Twee kinderen samen in beeld. Zo zie je actie én reactie tegelijk.',
  },
  {
    code: 'PUB',
    name: 'Publiek',
    hint: 'Draai om en film de zaal. Maakt de afternovie goud.',
  },
  {
    code: '—',
    name: 'Vrij',
    hint: 'Geen opdracht. Zoek zelf mooie beelden, maar luister naar de regie.',
  },
];

/**
 * The codes for the shots that FEY offers on top of the handbook, so every
 * shot in the library also has a short code.
 */
export const EXTRA_SHOT_CODES: Record<string, string> = {
  'Extreme close-up': 'XCU',
  'Over-the-shoulder': 'OTS',
  'Tracking shot': 'TRK',
  Pan: 'PAN',
  Tilt: 'TIL',
  'Static shot': 'ST',
  'Dutch angle': 'DUT',
  'Overhead shot': 'OD',
  'Shot from below': 'LOW',
};

/** The code that belongs to a shot name, or an empty string when unknown. */
export function shotCode(name: string | null | undefined): string {
  if (!name) return '';
  const trimmed = name.trim();
  const handbook = HANDBOOK_SHOTS.find(
    (shot) => shot.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (handbook) return handbook.code;
  return EXTRA_SHOT_CODES[trimmed] ?? '';
}

/**
 * The code of a shot, together with the full name.
 *
 * Shots that are not in the handbook keep their own name as the code, so the
 * interface never shows an empty label.
 */
export function shotLabel(name: string | null | undefined): { code: string; name: string } {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return { code: '', name: '' };
  return { code: shotCode(trimmed), name: trimmed };
}
