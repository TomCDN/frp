import { io, type Socket } from 'socket.io-client';

/**
 * A single shared Socket.IO connection for the whole application.
 *
 * Creating the socket once means the iPad keeps one persistent connection
 * regardless of which page is open, and reconnects are handled by the
 * library (with a short back-off so a restarted server is picked up fast).
 *
 * By default the socket connects to the origin the page was served from. In
 * development the Vite proxy forwards `/socket.io` to the API server, so this
 * keeps working on both ports without extra configuration.
 */
const SOCKET_URL: string | undefined = import.meta.env.VITE_SOCKET_URL ?? undefined;

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
      timeout: 8000,
    });
  }
  return socket;
}

export function emitOperatorJoin(payload: {
  showId: string;
  crewId?: string;
  cameraId?: string;
  deviceName?: string;
}): void {
  getSocket().emit('operator:join', payload);
}

export function emitOperatorAck(payload: { showId: string; cueId: string }): void {
  getSocket().emit('operator:ack', payload);
}

export function emitHeartbeat(payload: { showId: string }): void {
  getSocket().emit('operator:heartbeat', payload);
}
