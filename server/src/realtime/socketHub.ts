import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import type { LiveState } from '../types';

export interface OperatorStatus {
  crewId: string;
  cameraId: string;
  connected: boolean;
  lastSeen: string;
  receivedCueId: string | null;
  receivedAt: string | null;
  deviceName?: string;
}

/**
 * Central realtime hub.
 *
 * Rooms:
 *  - `show:<showId>`  : everyone watching a show (director + operators)
 *  - `device:<crewId>` : a single camera operator device
 *
 * All state changes are broadcast immediately so the iPads never need a reload.
 */
class SocketHub {
  private io: Server | null = null;
  private operators = new Map<string, OperatorStatus>();

  init(httpServer: HttpServer): void {
    this.io = new Server(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
      pingInterval: 10000,
      pingTimeout: 10000,
    });

    this.io.on('connection', (socket) => this.handleConnection(socket));
  }

  private handleConnection(socket: Socket): void {
    socket.on('operator:join', (payload: { showId: string; crewId?: string; cameraId?: string; deviceName?: string }) => {
      if (!payload?.showId) return;
      socket.join(`show:${payload.showId}`);
      socket.data.showId = payload.showId;

      /*
        The director watches a show without being a camera operator, so the
        crew id is optional. Only a device with a crew id counts as an
        operator and is tracked as such.
      */
      if (!payload.crewId) return;

      socket.join(`device:${payload.crewId}`);
      socket.data.crewId = payload.crewId;
      socket.data.cameraId = payload.cameraId ?? '';

      const existing = this.operators.get(payload.crewId);
      this.operators.set(payload.crewId, {
        crewId: payload.crewId,
        cameraId: payload.cameraId ?? '',
        connected: true,
        lastSeen: new Date().toISOString(),
        receivedCueId: existing?.receivedCueId ?? null,
        receivedAt: existing?.receivedAt ?? null,
        deviceName: payload.deviceName,
      });
      this.broadcastOperatorStatus(payload.showId);
    });

    socket.on('operator:ack', (payload: { showId: string; cueId: string }) => {
      if (!payload?.showId || !payload?.cueId) return;
      const crewId = socket.data.crewId as string | undefined;
      if (!crewId) return;
      const status = this.operators.get(crewId);
      if (status) {
        status.receivedCueId = payload.cueId;
        status.receivedAt = new Date().toISOString();
        this.broadcastOperatorStatus(payload.showId);
      }
    });

    socket.on('operator:heartbeat', (payload: { showId: string }) => {
      const crewId = socket.data.crewId as string | undefined;
      if (!crewId) return;
      const status = this.operators.get(crewId);
      if (status) {
        status.lastSeen = new Date().toISOString();
        status.connected = true;
        this.broadcastOperatorStatus(payload.showId);
      }
    });

    socket.on('disconnect', () => {
      const crewId = socket.data.crewId as string | undefined;
      const showId = socket.data.showId as string | undefined;
      if (crewId) {
        const status = this.operators.get(crewId);
        if (status) {
          status.connected = false;
          status.lastSeen = new Date().toISOString();
        }
        if (showId) this.broadcastOperatorStatus(showId);
      }
    });
  }

  /** Broadcasts the full live state of a show to everyone in that show's room. */
  broadcastLiveState(showId: string, state: LiveState, extra?: Record<string, unknown>): void {
    if (!this.io) return;
    this.io.to(`show:${showId}`).emit('live:state', { ...state, ...extra });
  }

  /** Sends a direct message to one operator device. */
  sendDirectMessage(crewId: string, payload: { text: string; fromName: string }): void {
    if (!this.io) return;
    this.io.to(`device:${crewId}`).emit('crew:message', payload);
  }

  /** Sends a direct message to every operator of a show. */
  sendToAllOperators(showId: string, payload: { text: string; fromName: string; kind: string }): void {
    if (!this.io) return;
    this.io.to(`show:${showId}`).emit('crew:message', payload);
  }

  broadcastOperatorStatus(showId: string): void {
    if (!this.io) return;
    this.io.to(`show:${showId}`).emit('operators:status', this.getOperatorStatuses(showId));
  }

  getOperatorStatuses(showId: string): OperatorStatus[] {
    const statuses = [...this.operators.values()];
    if (statuses.length === 0) return statuses;
    // Only return operators that belong to this show (by crew assignment).
    const { all } = require('../db/database') as typeof import('../db/database');
    const { getShowCrew } = require('../services/showService') as typeof import('../services/showService');
    const crewIds = new Set(getShowCrew(showId));
    const filtered = statuses.filter((status) => crewIds.has(status.crewId));
    if (filtered.length) return filtered;
    // Fall back to all known operators so a fresh show still shows devices.
    return statuses;
  }

  get server(): Server | null {
    return this.io;
  }
}

export const socketHub = new SocketHub();
