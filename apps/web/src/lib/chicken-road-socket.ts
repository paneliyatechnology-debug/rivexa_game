import { io, Socket } from 'socket.io-client';
import { getWsBaseUrl } from './config';
import { getUserTokenOrGuestId } from './chicken-road-api';

let socketInstance: Socket | null = null;
let currentUserId: string | null = null;

export const getChickenRoadSocket = (userId?: string): Socket => {
  const activeUserId = userId || getUserTokenOrGuestId();
  const wsUrl = getWsBaseUrl();

  if (!socketInstance || currentUserId !== activeUserId) {
    if (socketInstance) {
      socketInstance.disconnect();
    }
    currentUserId = activeUserId;
    socketInstance = io(`${wsUrl}/chicken-road`, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
      query: { userId: activeUserId },
      extraHeaders: {
        'x-user-id': activeUserId,
        Authorization: `Bearer ${activeUserId}`,
      },
    });
  }
  return socketInstance;
};
