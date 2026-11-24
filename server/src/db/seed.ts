import { get, nowIso, run, transaction } from './database';
import { initSchema } from './schema';
import { newAccessCode, newId } from '../utils/id';
import type { Cue, StageElement } from '../types';

/**
 * Seeds a complete example show ("Musical 2027") so every feature can be
 * tested right after installation. Running this twice does nothing, so it is
 * safe to call on every boot.
 */
export function seedDatabase(force = false): void {
  initSchema();

  const existing = get<{ id: string }>("SELECT id FROM shows WHERE name = 'Musical 2027' LIMIT 1");
  if (existing && !force) return;

  if (force) {
    // Remove demo data only, never user data.
    const demoShow = get<{ id: string }>("SELECT id FROM shows WHERE name = 'Musical 2027'");
    if (demoShow) run('DELETE FROM shows WHERE id = ?', demoShow.id);
    const demoStage = get<{ id: string }>("SELECT id FROM stages WHERE name = 'Grote zaal - hoofd podium'");
    if (demoStage) run('DELETE FROM stages WHERE id = ?', demoStage.id);
  }

  const ts = nowIso();

  /* ------------------------- Stage ------------------------- */
  const stageId = newId();
  run(
    `INSERT INTO stages (id, name, description, width_cm, height_cm, depth_cm, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    stageId,
    'Grote zaal - hoofd podium',
    'Standaard podium voor de grote zaal. 12m breed, 8m diep, 2m toneelplatform.',
    1200,
    800,
    200,
    ts,
    ts,
  );

  const elements: StageElement[] = [
    // Podiumvloer (achtergrond van het speelvlak) - centered on the stage
    {
      id: newId(),
      type: 'floor',
      name: 'Podiumvloer',
      x: 600,
      y: 400,
      width: 1200,
      height: 800,
      rotation: 0,
      props: { color: '#1e293b' },
      layer: 'floor',
      locked: false,
      visible: true,
    },
    // Toneelplatform (verhoogd deel)
    {
      id: newId(),
      type: 'platform',
      name: 'Toneelplatform',
      x: 600,
      y: 300,
      width: 900,
      height: 240,
      rotation: 0,
      props: { color: '#334155', heightCm: 80 },
      layer: 'scenery',
      locked: false,
      visible: true,
    },
    // Achtergrond / decor
    {
      id: newId(),
      type: 'backdrop',
      name: 'Achtergrond doek',
      x: 600,
      y: 90,
      width: 1100,
      height: 60,
      rotation: 0,
      props: { color: '#1e3a5f' },
      layer: 'scenery',
      locked: false,
      visible: true,
    },
    // Trappen links
    {
      id: newId(),
      type: 'stairs',
      name: 'Trappen links',
      x: 120,
      y: 300,
      width: 120,
      height: 160,
      rotation: 0,
      props: { color: '#475569', steps: 4 },
      layer: 'scenery',
      locked: false,
      visible: true,
    },
    // Trappen rechts
    {
      id: newId(),
      type: 'stairs',
      name: 'Trappen rechts',
      x: 1080,
      y: 300,
      width: 120,
      height: 160,
      rotation: 0,
      props: { color: '#475569', steps: 4 },
      layer: 'scenery',
      locked: false,
      visible: true,
    },
    // Deur
    {
      id: newId(),
      type: 'door',
      name: 'Deur toneel',
      x: 200,
      y: 95,
      width: 70,
      height: 120,
      rotation: 0,
      props: { color: '#7c3aed' },
      layer: 'scenery',
      locked: false,
      visible: true,
    },
    // Tafel
    {
      id: newId(),
      type: 'table',
      name: 'Tafel',
      x: 850,
      y: 330,
      width: 160,
      height: 80,
      rotation: 0,
      props: { color: '#78350f' },
      layer: 'scenery',
      locked: false,
      visible: true,
    },
    // Microfoon
    {
      id: newId(),
      type: 'microphone',
      name: 'Microfoon front',
      x: 600,
      y: 480,
      width: 30,
      height: 30,
      rotation: 0,
      props: { color: '#e5e7eb' },
      layer: 'scenery',
      locked: false,
      visible: true,
    },
    // Instrumenten
    {
      id: newId(),
      type: 'instrument',
      name: 'Piano',
      x: 250,
      y: 250,
      width: 140,
      height: 80,
      rotation: 0,
      props: { color: '#111827', instrument: 'piano' },
      layer: 'scenery',
      locked: false,
      visible: true,
    },
    {
      id: newId(),
      type: 'instrument',
      name: 'Drumkit',
      x: 1000,
      y: 240,
      width: 130,
      height: 90,
      rotation: 0,
      props: { color: '#111827', instrument: 'drums' },
      layer: 'scenery',
      locked: false,
      visible: true,
    },
    // Lichtposities
    {
      id: newId(),
      type: 'light',
      name: 'Licht 1 - front left',
      x: 150,
      y: 540,
      width: 50,
      height: 50,
      rotation: 0,
      props: { color: '#fbbf24' },
      layer: 'lighting',
      locked: false,
      visible: true,
    },
    {
      id: newId(),
      type: 'light',
      name: 'Licht 2 - front right',
      x: 1050,
      y: 540,
      width: 50,
      height: 50,
      rotation: 0,
      props: { color: '#fbbf24' },
      layer: 'lighting',
      locked: false,
      visible: true,
    },
    // Personen en groepen
    {
      id: newId(),
      type: 'person',
      name: 'Emma - Hoofdrol',
      x: 520,
      y: 330,
      width: 45,
      height: 45,
      rotation: 0,
      props: { color: '#ef4444' },
      layer: 'people',
      locked: false,
      visible: true,
    },
    {
      id: newId(),
      type: 'person',
      name: 'Lucas - Tegenspeler',
      x: 700,
      y: 340,
      width: 45,
      height: 45,
      rotation: 0,
      props: { color: '#f97316' },
      layer: 'people',
      locked: false,
      visible: true,
    },
    {
      id: newId(),
      type: 'group',
      name: 'Dansgroep',
      x: 600,
      y: 480,
      width: 160,
      height: 80,
      rotation: 0,
      props: { color: '#3b82f6', count: 8 },
      layer: 'people',
      locked: false,
      visible: true,
    },
    {
      id: newId(),
      type: 'group',
      name: 'Koor',
      x: 600,
      y: 180,
      width: 400,
      height: 70,
      rotation: 0,
      props: { color: '#22c55e', count: 24 },
      layer: 'people',
      locked: false,
      visible: true,
    },
    // Camera posities
    {
      id: newId(),
      type: 'camera',
      name: 'Camera 1 - Wide',
      x: 600,
      y: 760,
      width: 40,
      height: 40,
      rotation: 0,
      props: { color: '#3b82f6', direction: 270, cameraNumber: 1 },
      layer: 'cameras',
      locked: false,
      visible: true,
    },
    {
      id: newId(),
      type: 'camera',
      name: 'Camera 2 - Medium',
      x: 150,
      y: 700,
      width: 40,
      height: 40,
      rotation: 0,
      props: { color: '#ef4444', direction: 315, cameraNumber: 2 },
      layer: 'cameras',
      locked: false,
      visible: true,
    },
    {
      id: newId(),
      type: 'camera',
      name: 'Camera 3 - Close-up',
      x: 1050,
      y: 700,
      width: 40,
      height: 40,
      rotation: 0,
      props: { color: '#22c55e', direction: 225, cameraNumber: 3 },
      layer: 'cameras',
      locked: false,
      visible: true,
    },
    {
      id: newId(),
      type: 'camera',
      name: 'Camera 4 - Moving',
      x: 600,
      y: 620,
      width: 40,
      height: 40,
      rotation: 0,
      props: { color: '#eab308', direction: 270, cameraNumber: 4 },
      layer: 'cameras',
      locked: false,
      visible: true,
    },
    // Markering
    {
      id: newId(),
      type: 'marker',
      name: 'Startmarkering',
      x: 600,
      y: 430,
      width: 40,
      height: 40,
      rotation: 0,
      props: { color: '#f43f5e', symbol: 'X' },
      layer: 'overlay',
      locked: false,
      visible: true,
    },
    // Eigen tekstlabel
    {
      id: newId(),
      type: 'label',
      name: 'Label',
      x: 600,
      y: 30,
      width: 300,
      height: 40,
      rotation: 0,
      props: { text: 'HOOFDPODIUM', color: '#e2e8f0' },
      layer: 'overlay',
      locked: false,
      visible: true,
    },
  ];

  elements.forEach((element, index) => {
    run(
      `INSERT INTO stage_elements
       (id, stage_id, type, name, x, y, width, height, rotation, props, layer, locked, visible, group_id, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      element.id,
      stageId,
      element.type,
      element.name,
      element.x,
      element.y,
      element.width,
      element.height,
      element.rotation,
      JSON.stringify(element.props),
      element.layer,
      0,
      1,
      null,
      index,
    );
  });

  /* ------------------------- Cameras ------------------------- */
  const cameraDefs = [
    { number: 1, name: 'Wide shot', type: 'Wide shot', color: '#3b82f6', notes: 'Hele podium, vaste positie in het midden.', lens: '24mm', x: 600, y: 760, direction: 270 },
    { number: 2, name: 'Medium shot', type: 'Medium shot', color: '#ef4444', notes: 'Linkerkant podium, volgt de hoofdrol.', lens: '50mm', x: 150, y: 700, direction: 315 },
    { number: 3, name: 'Close-up', type: 'Close-up', color: '#22c55e', notes: 'Close-ups van de hoofdrolspelers.', lens: '85mm', x: 1050, y: 700, direction: 225 },
    { number: 4, name: 'Moving camera', type: 'Tracking shot', color: '#eab308', notes: 'Dynamische shots, beweegt over de zaal.', lens: '35mm', x: 600, y: 620, direction: 270 },
  ];
  const cameraIds: string[] = [];
  cameraDefs.forEach((cam) => {
    const id = newId();
    cameraIds.push(id);
    run(
      `INSERT INTO cameras (id, number, name, type, color, notes, access_code, position_x, position_y, direction, lens)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      cam.number,
      cam.name,
      cam.type,
      cam.color,
      cam.notes,
      newAccessCode(),
      cam.x,
      cam.y,
      cam.direction,
      cam.lens,
    );
  });

  /* -------------------------- Crew --------------------------- */
  const crewDefs = [
    { name: 'Sanne de Vries', cameraIndex: 0, role: 'Hoofd cameraman' },
    { name: 'Joris Bakker', cameraIndex: 1, role: 'Cameraman' },
    { name: 'Fatima El Amrani', cameraIndex: 2, role: 'Cameraman' },
    { name: 'Tim Visser', cameraIndex: 3, role: 'Steadicam operator' },
    { name: 'Nora Jansen', cameraIndex: -1, role: 'Regie-assistent' },
  ];
  const crewIds: string[] = [];
  crewDefs.forEach((member) => {
    const id = newId();
    crewIds.push(id);
    run(
      `INSERT INTO crew (id, name, photo_url, camera_id, role, notes, created_at, updated_at)
       VALUES (?, ?, NULL, ?, ?, '', ?, ?)`,
      id,
      member.name,
      member.cameraIndex >= 0 ? cameraIds[member.cameraIndex] : null,
      member.role,
      ts,
      ts,
    );
  });

  /* --------------------------- Show -------------------------- */
  const showId = newId();
  run(
    `INSERT INTO shows (id, name, description, date, location, stage_id, archived, is_template, settings, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`,
    showId,
    'Musical 2027',
    'Voorbeeldproductie met volledige bezetting: drie scènes, tien cues, vier camera\'s en een uitgebreide podiumindeling. Gebruik deze show om alle functies van FEY te testen.',
    '2027-03-14',
    'Theater De Voorsteilin, Grote zaal',
    stageId,
    JSON.stringify({
      countdownSeconds: 5,
      operatorsCanAcknowledge: true,
      alertOnNewCue: true,
      timecodeFormat: 'mm:ss',
      standbyMessage: 'Wachten op regie...',
    }),
    ts,
    ts,
  );

  crewIds.slice(0, 4).forEach((crewId) => {
    run('INSERT OR IGNORE INTO show_crew (show_id, crew_id) VALUES (?, ?)', showId, crewId);
  });

  /* -------------------------- Scenes ------------------------- */
  const sceneDefs = [
    { name: 'Acte 1 - De Roeping', color: '#3b82f6', description: 'De helden ontdekken hun bestemming.' },
    { name: 'Acte 2 - De Betrekking', color: '#a855f7', description: 'Liefde, jaloezie en een keuze.' },
    { name: 'Acte 3 - De Oplossing', color: '#22c55e', description: 'Alles komt samen in de finale.' },
  ];
  const sceneIds: string[] = [];
  sceneDefs.forEach((scene, index) => {
    const id = newId();
    sceneIds.push(id);
    run(
      `INSERT INTO scenes (id, show_id, name, description, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
      id,
      showId,
      scene.name,
      scene.description,
      scene.color,
      index,
    );
  });

  /* --------------------------- Cues -------------------------- */
  const personIds = elements.filter((e) => e.type === 'person').map((e) => e.id);
  const groupIds = elements.filter((e) => e.type === 'group').map((e) => e.id);

  const cueDefs: Array<{
    scene: number;
    name: string;
    description: string;
    notes: string;
    duration: number;
    start: number;
    shots: Array<{ camera: number; shot: string; subject: string; movement: string; notes: string }>;
    placements: Array<{ element: number; x: number; y: number }>;
  }> = [
    {
      scene: 0,
      name: 'Opening - Doek open',
      description: 'Doek gaat open, licht komt op. Emma staat midden op het toneelplatform.',
      notes: 'Laat het licht 3 seconden opbouwen voordat de camera in beeld komt.',
      duration: 45,
      start: 0,
      shots: [
        { camera: 0, shot: 'Wide shot', subject: 'Hele podium', movement: 'Statisch', notes: 'Houd het frame op het midden.' },
        { camera: 1, shot: 'Medium shot', subject: 'Emma - Hoofdrol', movement: 'Slow push in', notes: 'Begin pas als het licht stabiel is.' },
        { camera: 2, shot: 'Close-up', subject: 'Emma - Hoofdrol', movement: 'Statisch', notes: 'Wacht op de emotie van Emma.' },
      ],
      placements: [
        { element: 0, x: 560, y: 300 },
        { element: 1, x: 640, y: 320 },
        { element: 3, x: 600, y: 200 },
      ],
    },
    {
      scene: 0,
      name: 'Solo Emma',
      description: 'Emma zingt het openingslied alleen, koor op de achtergrond.',
      notes: 'Let op: Emma draait zich bij het einde van deze scène om.',
      duration: 60,
      start: 45,
      shots: [
        { camera: 0, shot: 'Wide shot', subject: 'Hele podium', movement: 'Statisch', notes: '' },
        { camera: 1, shot: 'Medium shot', subject: 'Emma - Hoofdrol', movement: 'Pan', notes: 'Volg de draai van Emma.' },
        { camera: 2, shot: 'Extreme close-up', subject: 'Emma - Hoofdrol', movement: 'Statisch', notes: 'Vuurt de emotie uit.' },
      ],
      placements: [
        { element: 0, x: 600, y: 300 },
        { element: 1, x: 700, y: 330 },
        { element: 3, x: 600, y: 180 },
      ],
    },
    {
      scene: 0,
      name: 'Dansgroep entree',
      description: 'De dansgroep komt op het toneel vanaf links.',
      notes: '',
      duration: 30,
      start: 105,
      shots: [
        { camera: 0, shot: 'Wide shot', subject: 'Hele podium', movement: 'Statisch', notes: '' },
        { camera: 3, shot: 'Tracking shot', subject: 'Dansgroep', movement: 'Pan naar links', notes: 'Volg de groep het hele podium.' },
      ],
      placements: [
        { element: 0, x: 480, y: 340 },
        { element: 2, x: 380, y: 480 },
      ],
    },
    {
      scene: 0,
      name: 'Twee-shot Emma & Lucas',
      description: 'Emma en Lucas spelen samen het duet.',
      notes: '',
      duration: 40,
      start: 135,
      shots: [
        { camera: 0, shot: 'Wide shot', subject: 'Hele podium', movement: 'Statisch', notes: '' },
        { camera: 2, shot: 'Two-shot', subject: 'Emma & Lucas', movement: 'Statisch', notes: 'Beide gezichten in beeld.' },
        { camera: 3, shot: 'Over-the-shoulder', subject: 'Lucas - Tegenspeler', movement: 'Langzame dolly', notes: '' },
      ],
      placements: [
        { element: 0, x: 520, y: 320 },
        { element: 1, x: 660, y: 320 },
      ],
    },
    {
      scene: 0,
      name: 'Koor finale act 1',
      description: 'Het koor zingt het refrein, dansgroep erbij.',
      notes: '',
      duration: 50,
      start: 175,
      shots: [
        { camera: 0, shot: 'Wide shot', subject: 'Hele podium', movement: 'Statisch', notes: '' },
        { camera: 1, shot: 'Medium shot', subject: 'Koor', movement: 'Pan', notes: '' },
        { camera: 3, shot: 'Tracking shot', subject: 'Dansgroep', movement: 'Cirkelbeweging', notes: '' },
      ],
      placements: [
        { element: 0, x: 520, y: 320 },
        { element: 1, x: 660, y: 320 },
        { element: 2, x: 600, y: 470 },
        { element: 3, x: 600, y: 180 },
      ],
    },
    {
      scene: 1,
      name: 'Acte 2 - Betrekking',
      description: 'Emma en Lucas zijn nu samen, achtergrond verandert.',
      notes: 'Let op: achtergronddoek wisselt, wacht op de regie.',
      duration: 55,
      start: 225,
      shots: [
        { camera: 0, shot: 'Wide shot', subject: 'Hele podium', movement: 'Statisch', notes: '' },
        { camera: 1, shot: 'Medium shot', subject: 'Emma & Lucas', movement: 'Slow push in', notes: '' },
      ],
      placements: [
        { element: 0, x: 540, y: 320 },
        { element: 1, x: 620, y: 320 },
      ],
    },
    {
      scene: 1,
      name: 'Jaloezie',
      description: 'Lucas is jaloers, Emma merkt het op.',
      notes: '',
      duration: 45,
      start: 280,
      shots: [
        { camera: 2, shot: 'Close-up', subject: 'Lucas - Tegenspeler', movement: 'Statisch', notes: 'Focus op de ogen.' },
        { camera: 3, shot: 'Over-the-shoulder', subject: 'Emma - Hoofdrol', movement: 'Statisch', notes: '' },
        { camera: 0, shot: 'Wide shot', subject: 'Hele podium', movement: 'Statisch', notes: '' },
      ],
      placements: [
        { element: 0, x: 600, y: 330 },
        { element: 1, x: 460, y: 330 },
      ],
    },
    {
      scene: 1,
      name: 'Solo Lucas',
      description: 'Lucas alleen op het podium, monolog.',
      notes: '',
      duration: 35,
      start: 325,
      shots: [
        { camera: 1, shot: 'Medium shot', subject: 'Lucas - Tegenspeler', movement: 'Statisch', notes: '' },
        { camera: 2, shot: 'Extreme close-up', subject: 'Lucas - Tegenspeler', movement: 'Statisch', notes: 'Sterk moment.' },
      ],
      placements: [
        { element: 1, x: 600, y: 310 },
      ],
    },
    {
      scene: 2,
      name: 'Acte 3 - Finale',
      description: 'Alle personen komen samen voor de finale.',
      notes: '',
      duration: 75,
      start: 360,
      shots: [
        { camera: 0, shot: 'Wide shot', subject: 'Hele podium', movement: 'Cirkelbeweging', notes: 'Grote finalebeweging.' },
        { camera: 1, shot: 'Medium shot', subject: 'Emma - Hoofdrol', movement: 'Push in', notes: '' },
        { camera: 2, shot: 'Close-up', subject: 'Emma & Lucas', movement: 'Statisch', notes: '' },
        { camera: 3, shot: 'Tracking shot', subject: 'Dansgroep', movement: 'Pan naar rechts', notes: '' },
      ],
      placements: [
        { element: 0, x: 520, y: 300 },
        { element: 1, x: 660, y: 300 },
        { element: 2, x: 600, y: 470 },
        { element: 3, x: 600, y: 180 },
      ],
    },
    {
      scene: 2,
      name: 'Slot - Applaus',
      description: 'Alle spelers komen voor het gordijn, en applaus.',
      notes: 'Blijf op wide shot tot het licht volledig uitgaat.',
      duration: 40,
      start: 435,
      shots: [
        { camera: 0, shot: 'Wide shot', subject: 'Hele podium', movement: 'Statisch', notes: 'Blijft draaien tot licht uit.' },
        { camera: 1, shot: 'Medium shot', subject: 'Hele podium', movement: 'Statisch', notes: '' },
        { camera: 3, shot: 'Tracking shot', subject: 'Hele podium', movement: 'Pull back', notes: 'Trek de camera terug.' },
      ],
      placements: [
        { element: 0, x: 500, y: 300 },
        { element: 1, x: 580, y: 300 },
        { element: 2, x: 660, y: 300 },
        { element: 3, x: 600, y: 190 },
      ],
    },
  ];

  const cueIds: string[] = [];
  cueDefs.forEach((cue, index) => {
    const id = newId();
    cueIds.push(id);
    const shots: Cue['shots'] = {};
    cue.shots.forEach((assignment) => {
      const cameraId = cameraIds[assignment.camera];
      shots[cameraId] = {
        cameraId,
        shot: assignment.shot,
        subject: assignment.subject,
        movement: assignment.movement,
        notes: assignment.notes,
      };
    });
    const placements: Cue['placements'] = cue.placements.map((placement) => ({
      elementId:
        placement.element < personIds.length
          ? personIds[placement.element]
          : groupIds[placement.element - personIds.length],
      x: placement.x,
      y: placement.y,
      rotation: 0,
    }));
    run(
      `INSERT INTO cues (id, show_id, scene_id, number, name, description, start_seconds, duration_seconds,
         shots, placements, camera_positions, notes, reference_image_url, shot_reference_url, sort_order,
         acknowledged, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, NULL, NULL, ?, '{}', ?, ?)`,
      id,
      showId,
      sceneIds[cue.scene],
      index + 1,
      cue.name,
      cue.description,
      cue.start,
      cue.duration,
      JSON.stringify(shots),
      JSON.stringify(placements),
      cue.notes,
      index,
      ts,
      ts,
    );
  });

  /* ---------------------- Shot library ------------------------ */
  const shotDefs = [
    { name: 'Wide shot', description: 'Volledig overzicht van het hele podium.', movement: 'Statisch', icon: 'wide' },
    { name: 'Medium shot', description: 'Van de heupen omhoog, één person in beeld.', movement: 'Statisch', icon: 'medium' },
    { name: 'Close-up', description: 'Gezicht en schouders van de actor.', movement: 'Statisch', icon: 'close' },
    { name: 'Extreme close-up', description: 'Alleen ogen of een detail, voor intensieve emotie.', movement: 'Statisch', icon: 'ecu' },
    { name: 'Over-the-shoulder', description: 'Over de schouder van de voorgrondpersoon naar de achtergrond.', movement: 'Statisch', icon: 'ots' },
    { name: 'Tracking shot', description: 'De camera beweegt mee met de actie.', movement: 'Volg de beweging', icon: 'tracking' },
    { name: 'Pan', description: 'De camera draait van links naar rechts (of andersom).', movement: 'Pan', icon: 'pan' },
    { name: 'Tilt', description: 'De camera kantelt van boven naar beneden.', movement: 'Tilt', icon: 'tilt' },
    { name: 'Static shot', description: 'Volledig stilstaand, geen enkele beweging.', movement: 'Statisch', icon: 'static' },
    { name: 'Two-shot', description: 'Twee personen naast elkaar in één beeld.', movement: 'Statisch', icon: 'two' },
    { name: 'Crane shot', description: 'De camera stijgt of daalt met een crane.', movement: 'Crane omhoog', icon: 'crane' },
    { name: 'Dutch angle', description: 'Schuine hoek voor een onrustig gevoel.', movement: 'Statisch', icon: 'dutch' },
  ];
  shotDefs.forEach((shot, index) => {
    run(
      `INSERT INTO shot_templates (id, name, description, movement, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
      newId(),
      shot.name,
      shot.description,
      shot.movement,
      shot.icon,
      index,
    );
  });

  /* -------------------- Template show ------------------------- */
  const templateId = newId();
  run(
    `INSERT INTO shows (id, name, description, date, location, stage_id, archived, is_template, settings, created_at, updated_at)
     VALUES (?, ?, ?, NULL, ?, NULL, 0, 1, ?, ?, ?)`,
    templateId,
    'Template - Schoolvoorstelling',
    'Lege show-template met standaardinstellingen, één scène en de vier standaardcamera\'s. Gebruik dit als basis voor een nieuwe productie.',
    'Nog te bepalen',
    JSON.stringify({
      countdownSeconds: 5,
      operatorsCanAcknowledge: true,
      alertOnNewCue: true,
      timecodeFormat: 'mm:ss',
      standbyMessage: 'Wachten op regie...',
    }),
    ts,
    ts,
  );
  const templateSceneId = newId();
  run(
    `INSERT INTO scenes (id, show_id, name, description, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
    templateSceneId,
    templateId,
    'Acte 1',
    'Klik om te hernoemen',
    '#3b82f6',
    0,
  );

  console.log('[fey] Voorbeeldshow "Musical 2027" aangemaakt.');
}

/* Allow running the seed directly: `npm run seed` / `npm run reset` */
if (require.main === module) {
  const reset = process.argv.includes('--reset');
  initSchema();
  if (reset) {
    transaction(() => {
      const demoShow = get<{ id: string }>("SELECT id FROM shows WHERE name = 'Musical 2027'");
      if (demoShow) run('DELETE FROM shows WHERE id = ?', demoShow.id);
      const demoStage = get<{ id: string }>("SELECT id FROM stages WHERE name = 'Grote zaal - hoofd podium'");
      if (demoStage) run('DELETE FROM stages WHERE id = ?', demoStage.id);
    });
    console.log('[fey] Demo-data verwijderd.');
  }
  seedDatabase(true);
}
