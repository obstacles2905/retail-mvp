import { io, type Socket } from 'socket.io-client';
import { getStoredToken } from '@/lib/auth';
import type { OfferMessage } from '@/lib/types/offer';

export type OffersSocketEvents = {
  'offers:message:new': (message: OfferMessage) => void;
};

function getWsBaseUrl(): string {
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
  return api.endsWith('/api') ? api.slice(0, -4) : api;
}

export function createOffersSocket(): Socket<OffersSocketEvents> {
  const token = getStoredToken();
  return io(getWsBaseUrl(), {
    transports: ['websocket'],
    auth: token ? { token } : undefined,
  });
}

