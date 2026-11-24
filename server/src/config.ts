import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const serverRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(serverRoot, '..');

function parsePorts(value: string | undefined): number[] {
  if (!value) return [];
  const ports = value
    .split(',')
    .map((p) => Number.parseInt(p.trim(), 10))
    .filter((p) => Number.isInteger(p) && p > 0 && p < 65536);
  return ports;
}

/** The port the FEY server listens on. */
export const PORT = Number.parseInt(process.env.FEY_PORT ?? '3000', 10);

/** Vite dev server port (the LAN URL clients use during development). */
export const CLIENT_PORT = Number.parseInt(process.env.FEY_CLIENT_PORT ?? '5173', 10);

/** Extra ports the server also binds to (useful when 3000 is blocked). */
export const EXTRA_PORTS = parsePorts(process.env.FEY_EXTRA_PORTS);

/** Where the SQLite database file lives. */
export const DATA_DIR = process.env.FEY_DATA_DIR
  ? path.resolve(process.env.FEY_DATA_DIR)
  : path.join(repoRoot, 'data');

export const DB_FILE = path.join(DATA_DIR, 'fey.db');

/** Directory with static build output (production mode). */
export const CLIENT_DIST = path.join(repoRoot, 'client', 'dist');

/** Directory for uploaded images (camera photos, cue reference images). */
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/** All IPv4 addresses of this machine, so the director knows where to point the iPads. */
export function getLanAddresses(): string[] {
  const addresses: string[] = [];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

export const UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
