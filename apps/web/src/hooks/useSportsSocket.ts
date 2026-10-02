'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from '@/lib/config';

export function useSportsSocket(matchId?: string): {
  isConnected: boolean;
  liveUpdate: any;
  ballEvent: any;
  matchCompletedEvent: any;
  socket: Socket | null;
} {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [liveUpdate, setLiveUpdate] = useState<any>(null);
  const [ballEvent, setBallEvent] = useState<any>(null);
  const [matchCompletedEvent, setMatchCompletedEvent] = useState<any>(null);

  useEffect(() => {
    // Deriving WebSocket URL from REST API Base URL
    const baseUrl = getApiBaseUrl(); // e.g. http://localhost:4000/api/v1
    const socketHost = baseUrl.replace(/\/api\/v1\/?$/, ''); // e.g. http://localhost:4000

    const socket = io(`${socketHost}/sports`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      if (matchId) {
        socket.emit('subscribe_match', { matchId });
      } else {
        socket.emit('subscribe_sports_live');
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('cricket.score.updated', (data: any) => {
      setLiveUpdate(data);
    });

    socket.on('cricket.ball.completed', (data: any) => {
      setBallEvent(data);
    });

    socket.on('cricket.match.completed', (data: any) => {
      setMatchCompletedEvent(data);
    });

    return () => {
      if (matchId && socket.connected) {
        socket.emit('unsubscribe_match', { matchId });
      }
      socket.disconnect();
    };
  }, [matchId]);

  return {
    isConnected,
    liveUpdate,
    ballEvent,
    matchCompletedEvent,
    socket: socketRef.current,
  };
}
