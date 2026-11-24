import { DatabaseSync } from 'node:sqlite';
import { DB_FILE } from '../config';

/**
 * Thin wrapper around the built-in `node:sqlite` driver.
 * Using the Node built-in avoids native compilation steps entirely, so
 * `npm install` works offline on any machine with Node >= 22.5.
 */
export const db = new DatabaseSync(DB_FILE);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function nowIso(): string {
  return new Date().toISOString();
}

export function run(sql: string, ...params: unknown[]): void {
  db.prepare(sql).run(...(params as never[]));
}

export function get<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T | undefined {
  const row = db.prepare(sql).get(...(params as never[]));
  return (row ?? undefined) as T | undefined;
}

export function all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
  return db.prepare(sql).all(...(params as never[])) as T[];
}

export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
