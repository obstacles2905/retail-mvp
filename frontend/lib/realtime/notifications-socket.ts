import { io, Socket } from 'socket.io-client';
import { getStoredToken } from '../auth';

let socket: Socket | null = null;

function getWsBaseUrl(): string {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
  return apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
}

export function getNotificationsSocket(): Socket {
  if (!socket) {
    socket = io(getWsBaseUrl(), {
      auth: { token: getStoredToken() },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socket.on('connect', () => {
      socket!.emit('notifications:join');
    });
  }
  return socket;
}

export function connectNotifications(): void {
  const s = getNotificationsSocket();
  if (s.disconnected) {
    s.auth = { token: getStoredToken() };
    s.connect();
  }
}

export function disconnectNotifications(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
