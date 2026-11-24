import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { emitHeartbeat, emitOperatorAck, emitOperatorJoin, getSocket } from '../lib/socket';
import type { LiveState, OperatorStatus } from '../types';

export interface CrewMessage {
  text: string;
  fromName: string;
  kind: string;
}

export interface UseSocketOptions {
  showId: string | null;
  crewId?: string | null;
  cameraId?: string | null;
  onLiveState?: (state: LiveState) => void;
  onMessage?: (message: CrewMessage) => void;
  onOperatorStatus?: (statuses: OperatorStatus[]) => void;
}

export interface UseSocketResult {
  connected: boolean;
  liveState: LiveState | null;
  operatorStatuses: OperatorStatus[];
  lastMessage: CrewMessage | null;
  acknowledge: (cueId: string) => void;
}

/**
 * Subscribes to the shared socket and exposes live show state.
 *
 * The socket itself is a singleton (see lib/socket.ts); this hook only
 * attaches listeners for the lifetime of the component.
 */
export function useSocket(options: UseSocketOptions): UseSocketResult {
  const [connected, setConnected] = useState(false);
  const [liveState, setLiveState] = useState<LiveState | null>(null);
  const [operatorStatuses, setOperatorStatuses] = useState<OperatorStatus[]>([]);
  const [lastMessage, setLastMessage] = useState<CrewMessage | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const socket: Socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onLiveState = (state: LiveState) => {
      setLiveState(state);
      optionsRef.current.onLiveState?.(state);
    };
    const onMessage = (message: CrewMessage) => {
      setLastMessage(message);
      optionsRef.current.onMessage?.(message);
    };
    const onOperatorStatus = (statuses: OperatorStatus[]) => {
      setOperatorStatuses(statuses);
      optionsRef.current.onOperatorStatus?.(statuses);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('live:state', onLiveState);
    socket.on('crew:message', onMessage);
    socket.on('operators:status', onOperatorStatus);

    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('live:state', onLiveState);
      socket.off('crew:message', onMessage);
      socket.off('operators:status', onOperatorStatus);
    };
  }, []);

  // Join the show room (and the personal device room when known).
  useEffect(() => {
    if (!options.showId) return;
    emitOperatorJoin({
      showId: options.showId,
      // The director has no crew id; it only watches the show room.
      crewId: options.crewId || undefined,
      cameraId: options.cameraId || undefined,
      deviceName: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    });
  }, [options.showId, options.crewId, options.cameraId]);

  // Keep the presence indicators fresh.
  useEffect(() => {
    if (!options.showId || !options.crewId) return;
    const timer = window.setInterval(() => {
      emitHeartbeat({ showId: options.showId! });
    }, 15000);
    return () => window.clearInterval(timer);
  }, [options.showId, options.crewId]);

  const acknowledge = useCallback((cueId: string) => {
    if (!optionsRef.current.showId) return;
    emitOperatorAck({ showId: optionsRef.current.showId, cueId });
  }, []);

  return { connected, liveState, operatorStatuses, lastMessage, acknowledge };
}
