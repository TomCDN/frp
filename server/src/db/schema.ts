import { db } from './database';

/**
 * Creates the full schema. Idempotent: safe to call on every boot.
 */
export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      width_cm INTEGER NOT NULL DEFAULT 1200,
      height_cm INTEGER NOT NULL DEFAULT 800,
      depth_cm INTEGER NOT NULL DEFAULT 200,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stage_elements (
      id TEXT PRIMARY KEY,
      stage_id TEXT NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      x REAL NOT NULL DEFAULT 0,
      y REAL NOT NULL DEFAULT 0,
      width REAL NOT NULL DEFAULT 100,
      height REAL NOT NULL DEFAULT 100,
      rotation REAL NOT NULL DEFAULT 0,
      props TEXT NOT NULL DEFAULT '{}',
      layer TEXT NOT NULL DEFAULT 'scenery',
      locked INTEGER NOT NULL DEFAULT 0,
      visible INTEGER NOT NULL DEFAULT 1,
      group_id TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_stage_elements_stage ON stage_elements(stage_id);

    CREATE TABLE IF NOT EXISTS cameras (
      id TEXT PRIMARY KEY,
      number INTEGER NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '#3b82f6',
      notes TEXT NOT NULL DEFAULT '',
      access_code TEXT NOT NULL DEFAULT '',
      position_x REAL NOT NULL DEFAULT 0,
      position_y REAL NOT NULL DEFAULT 0,
      direction REAL NOT NULL DEFAULT 0,
      lens TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS crew (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      photo_url TEXT,
      camera_id TEXT REFERENCES cameras(id) ON DELETE SET NULL,
      role TEXT NOT NULL DEFAULT 'Cameraman',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      date TEXT,
      location TEXT NOT NULL DEFAULT '',
      stage_id TEXT REFERENCES stages(id) ON DELETE SET NULL,
      archived INTEGER NOT NULL DEFAULT 0,
      is_template INTEGER NOT NULL DEFAULT 0,
      settings TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS show_crew (
      show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
      crew_id TEXT NOT NULL REFERENCES crew(id) ON DELETE CASCADE,
      PRIMARY KEY (show_id, crew_id)
    );

    CREATE TABLE IF NOT EXISTS scenes (
      id TEXT PRIMARY KEY,
      show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '#64748b',
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_scenes_show ON scenes(show_id);

    CREATE TABLE IF NOT EXISTS cues (
      id TEXT PRIMARY KEY,
      show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
      scene_id TEXT REFERENCES scenes(id) ON DELETE SET NULL,
      number INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      start_seconds REAL,
      duration_seconds REAL NOT NULL DEFAULT 0,
      shots TEXT NOT NULL DEFAULT '{}',
      placements TEXT NOT NULL DEFAULT '[]',
      camera_positions TEXT NOT NULL DEFAULT '{}',
      notes TEXT NOT NULL DEFAULT '',
      reference_image_url TEXT,
      shot_reference_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      acknowledged TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cues_show ON cues(show_id);

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
      from_crew_id TEXT,
      from_name TEXT NOT NULL DEFAULT '',
      to_crew_id TEXT,
      text TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'normal',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_messages_show ON messages(show_id, created_at);

    CREATE TABLE IF NOT EXISTS live_state (
      show_id TEXT PRIMARY KEY REFERENCES shows(id) ON DELETE CASCADE,
      current_cue_id TEXT,
      next_cue_id TEXT,
      rehearsal INTEGER NOT NULL DEFAULT 0,
      emergency TEXT,
      direct_messages TEXT NOT NULL DEFAULT '{}',
      sequence INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shot_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      movement TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT 'camera',
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Additive migrations for databases created by an earlier version.
  // Each migration is guarded so it only runs once.
  migrate();
}

function migrate(): void {
  const columns = db.prepare('PRAGMA table_info(shows)').all() as Array<{ name: string }>;
  const names = columns.map((column) => column.name);

  // Shows that were duplicated own their private copy of the stage, so the
  // copy is deleted together with the show.
  if (!names.includes('owns_stage')) {
    db.exec('ALTER TABLE shows ADD COLUMN owns_stage INTEGER NOT NULL DEFAULT 0');
  }
}
