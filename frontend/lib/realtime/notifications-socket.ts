import { io, Socket } from 'socket.io-client';
import { getStoredToken } from '../auth';

let socket: Socket | null = null;

export function getNotificationsSocket(): Socket {
  if (!socket) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
    const baseUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
    
    socket = io(baseUrl, {
      auth: { token: getStoredToken() },
      autoConnect: false,
    });
  }
  return socket;
}

export function connectNotifications(): void {
  const s = getNotificationsSocket();
  if (s.disconnected) {
    s.auth = { token: getStoredToken() };
    s.connect();
    s.emit('notifications:join');
  }
}

export function disconnectNotifications(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
