import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class ChatsRealtimeService {
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  emitNewMessage(chatId: string, message: any) {
    if (!this.server) return;
    this.server.to(`chat_${chatId}`).emit('chat:message:new', message);
  }
}
