import { io, Socket } from 'socket.io-client';
import { getStoredToken } from '../auth';
import type { ChatMessageDto } from '../types/chat';

export interface ServerToClientEvents {
  'chat:message:new': (message: ChatMessageDto) => void;
}

export interface ClientToServerEvents {
  'chat:join': (data: { chatId: string }, callback?: (res: { ok: boolean }) => void) => void;
  'chat:message:send': (
    data: { chatId: string; content: string },
    callback?: (res: { ok: boolean; message?: ChatMessageDto; error?: string }) => void
  ) => void;
}

export type ChatsSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createChatsSocket(): ChatsSocket {
  const token = getStoredToken();
  const url = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001';

  return io(url, {
    auth: { token },
    autoConnect: false,
  });
}
