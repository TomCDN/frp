import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';

import { CLIENT_DIST, EXTRA_PORTS, PORT, UPLOADS_DIR, getLanAddresses } from './config';
import { initSchema } from './db/schema';
import { seedDatabase } from './db/seed';
import { socketHub } from './realtime/socketHub';
import { HttpError } from './utils/http';

import { stagesRouter } from './routes/stages';
import { crewRouter, camerasRouter } from './routes/crew';
import { showsRouter, cuesRouter, scenesRouter } from './routes/shows';
import { liveRouter, messagesRouter } from './routes/live';
import { dashboardRouter } from './routes/dashboard';
import { exportRouter } from './routes/export';
import { shotTemplatesRouter } from './routes/shotTemplates';
import { uploadsRouter } from './routes/uploads';

initSchema();
seedDatabase();

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '12mb' }));

// Request logging (concise, useful when debugging on a LAN).
app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api')) {
      console.log(`[api] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started}ms)`);
    }
  });
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'fey',
    time: new Date().toISOString(),
    lanAddresses: getLanAddresses(),
  });
});

app.use('/api/stages', stagesRouter);
app.use('/api/crew', crewRouter);
app.use('/api/cameras', camerasRouter);
app.use('/api/shows', showsRouter);
app.use('/api/cues', cuesRouter);
app.use('/api/scenes', scenesRouter);
app.use('/api/live', liveRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/export', exportRouter);
app.use('/api/shot-templates', shotTemplatesRouter);
app.use('/api/uploads', uploadsRouter);

app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));

// Serve the built client in production mode.
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST, { index: false }));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Onbekende API-route' });
});

// Central error handler.
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, details: error.details });
    return;
  }
  console.error('[error]', error);
  res.status(500).json({ error: 'Interne serverfout' });
});

const server = http.createServer(app);
socketHub.init(server);

function listen(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        reject(new Error(`Poort ${port} is al in gebruik`));
      } else {
        reject(error);
      }
    };
    server.once('error', onError);
    server.listen(port, '0.0.0.0', () => {
      server.off('error', onError);
      resolve();
    });
  });
}

async function start(): Promise<void> {
  /*
    The port can be taken for a moment, for example when a production server
    is stopped while the dev server is already running. Instead of exiting for
    good, the server waits and tries again, so `tsx watch` does not have to be
    restarted by hand.
  */
  const maxAttempts = 30;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await listen(PORT);
      break;
    } catch (error) {
      const message = (error as Error).message;
      if (!message.includes('al in gebruik')) {
        console.error(`[fey] ${message}`);
        process.exit(1);
      }
      console.error(
        `[fey] Poort ${PORT} is al in gebruik — poging ${attempt}/${maxAttempts} over ${(attempt * 2) / 1}s...`,
      );
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      if (attempt === maxAttempts) {
        console.error(`[fey] Poort ${PORT} blijft in gebruik. Gebruik FEY_PORT om een andere poort te kiezen.`);
        process.exit(1);
      }
    }
  }

  for (const extraPort of EXTRA_PORTS) {
    const extra = http.createServer(app);
    extra.listen(extraPort, '0.0.0.0', () => {
      console.log(`[fey] Extra listener op poort ${extraPort}`);
    });
  }

  const addresses = getLanAddresses();
  console.log('');
  console.log('  ██ FEY — Event Filming Crew Management');
  console.log('  ─────────────────────────────────────────────');
  console.log(`  Lokaal:      http://localhost:${PORT}`);
  for (const address of addresses) {
    console.log(`  Netwerk:     http://${address}:${PORT}`);
  }
  console.log(`  Operator:    http://localhost:${PORT}/operator`);
  console.log('');

  const shutdown = () => {
    console.log('\n[fey] Server afsluiten...');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

void start();
