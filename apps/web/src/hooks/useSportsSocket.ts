'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from '@/lib/config';

export function useSportsSocket(matchId?: string): {
  isConnected: boolean;
  liveUpdate: any;
  ballEvent: any;
  oddsUpdate: any;
  matchCompletedEvent: any;
  marketClosedEvent: any;
  marketSettledEvent: any;
  marketUpdatedEvent: any;
  matchMarketsClosedEvent: any;
  socket: Socket | null;
  connectionVersion: number;
} {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionVersion, setConnectionVersion] = useState(0);
  const [liveUpdate, setLiveUpdate] = useState<any>(null);
  const [ballEvent, setBallEvent] = useState<any>(null);
  const [oddsUpdate, setOddsUpdate] = useState<any>(null);
  const [matchCompletedEvent, setMatchCompletedEvent] = useState<any>(null);
  const [marketClosedEvent, setMarketClosedEvent] = useState<any>(null);
  const [marketSettledEvent, setMarketSettledEvent] = useState<any>(null);
  const [marketUpdatedEvent, setMarketUpdatedEvent] = useState<any>(null);
  const [matchMarketsClosedEvent, setMatchMarketsClosedEvent] = useState<any>(null);

  useEffect(() => {
    const seenEvents = new Set<string>();
    const acceptEvent = (eventName: string, payload: any) => {
      const eventId = [eventName, payload?.eventId || payload?.matchId || 'all', payload?.marketId || '', payload?.selectionId || '', payload?.updatedAt || ''].join(':');
      if (seenEvents.has(eventId)) return false;
      seenEvents.add(eventId);
      if (seenEvents.size > 200) seenEvents.clear();
      return true;
    };

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
      setConnectionVersion((version) => version + 1);
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
      if (acceptEvent('cricket.score.updated', data)) setLiveUpdate(data);
    });

    socket.on('cricket.ball.completed', (data: any) => {
      if (acceptEvent('cricket.ball.completed', data)) setBallEvent(data);
    });

    socket.on('cricket.odds.updated', (data: any) => {
      if (acceptEvent('cricket.odds.updated', data)) setOddsUpdate(data);
    });

    socket.on('cricket.match.completed', (data: any) => {
      if (acceptEvent('cricket.match.completed', data)) setMatchCompletedEvent(data);
    });

    socket.on('market.closed', (data: any) => {
      if (acceptEvent('market.closed', data)) setMarketClosedEvent(data);
    });

    socket.on('market.settled', (data: any) => {
      if (acceptEvent('market.settled', data)) setMarketSettledEvent(data);
    });

    socket.on('market.updated', (data: any) => {
      if (acceptEvent('market.updated', data)) setMarketUpdatedEvent(data);
    });

    socket.on('match.completed', (data: any) => {
      if (acceptEvent('match.completed', data)) setMatchCompletedEvent(data);
    });

    socket.on('match.markets.closed', (data: any) => {
      if (acceptEvent('match.markets.closed', data)) setMatchMarketsClosedEvent(data);
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
    oddsUpdate,
    matchCompletedEvent,
    marketClosedEvent,
    marketSettledEvent,
    marketUpdatedEvent,
    matchMarketsClosedEvent,
    socket: socketRef.current,
    connectionVersion,
  };
}
