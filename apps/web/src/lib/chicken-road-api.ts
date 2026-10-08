import axios from 'axios';
import { getApiBaseUrl } from './config';

export function getOrGenerateGuestId(): string {
  if (typeof window === 'undefined') return 'guest_default';
  let guestId = localStorage.getItem('guest_user_id');
  if (!guestId) {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    guestId = `guest_${randomHex.slice(0, 8)}-${randomHex.slice(8, 12)}-4${randomHex.slice(13, 16)}-a${randomHex.slice(17, 20)}-${randomHex.slice(20, 32)}`;
    localStorage.setItem('guest_user_id', guestId);
  }
  return guestId;
}

export function getUserTokenOrGuestId(): string {
  if (typeof window === 'undefined') return 'guest_default';
  const token =
    localStorage.getItem('rivexa_token') ||
    localStorage.getItem('auth_token') ||
    sessionStorage.getItem('auth_token');
  if (token) return token;
  return getOrGenerateGuestId();
}

export const chickenRoadApiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach auth token / guest session ID and update baseURL dynamically
chickenRoadApiClient.interceptors.request.use((config) => {
  config.baseURL = `${getApiBaseUrl()}/game/chicken-road`;
  if (typeof window !== 'undefined') {
    const userToken = getUserTokenOrGuestId();
    config.headers.Authorization = `Bearer ${userToken}`;
    config.headers['x-user-id'] = userToken;
  }
  return config;
});

export const chickenRoadApi = {
  getConfig: async () => {
    const res = await chickenRoadApiClient.get('/config');
    return res.data.data;
  },

  getDifficulties: async () => {
    const res = await chickenRoadApiClient.get('/difficulties');
    return res.data.data;
  },

  createRound: async (payload: { betAmount: number; currency?: string; difficulty: string; clientSeed?: string }) => {
    const res = await chickenRoadApiClient.post('/rounds', payload);
    return res.data.data;
  },

  startRound: async (roundId: string) => {
    const res = await chickenRoadApiClient.post(`/rounds/${roundId}/start`);
    return res.data.data;
  },

  move: async (roundId: string, requestId?: string) => {
    const res = await chickenRoadApiClient.post(`/rounds/${roundId}/move`, { requestId });
    return res.data.data;
  },

  cashout: async (roundId: string, requestId?: string) => {
    const res = await chickenRoadApiClient.post(`/rounds/${roundId}/cashout`, { requestId });
    return res.data.data;
  },

  getActiveRound: async () => {
    const res = await chickenRoadApiClient.get('/rounds/active');
    return res.data.data;
  },

  getHistory: async (page = 1, limit = 20) => {
    const res = await chickenRoadApiClient.get(`/history?page=${page}&limit=${limit}`);
    return res.data.data;
  },

  getFairness: async (roundId: string) => {
    const res = await chickenRoadApiClient.get(`/fairness/${roundId}`);
    return res.data.data;
  },
};
