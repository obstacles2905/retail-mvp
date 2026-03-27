import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, ForbiddenException } from '@nestjs/common';
import { WsJwtGuard } from './ws-jwt.guard';
import { ChatsRealtimeService } from './chats-realtime.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@WebSocketGateway({
  cors: { origin: '*' },
  pingInterval: 25000,
  pingTimeout: 20000,
})
@UseGuards(WsJwtGuard)
export class ChatsGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly chatsRealtime: ChatsRealtimeService,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  afterInit(server: Server) {
    this.chatsRealtime.setServer(server);
  }

  @SubscribeMessage('notifications:join')
  async joinNotifications(@ConnectedSocket() client: Socket) {
    const user = client.data.user;
    if (!user) throw new ForbiddenException('Not authenticated');
    await client.join(`user_${user.sub}`);
    return { ok: true };
  }

  @SubscribeMessage('chat:join')
  async joinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    const user = client.data.user;
    if (!user) throw new ForbiddenException('Not authenticated');

    const chat = await this.prisma.chat.findUnique({ where: { id: data.chatId } });
    if (!chat || (chat.participant1Id !== user.sub && chat.participant2Id !== user.sub)) {
      throw new ForbiddenException('Access denied');
    }

    // Mark messages as read when joining
    await this.prisma.chatMessage.updateMany({
      where: {
        chatId: data.chatId,
        senderId: { not: user.sub },
        isRead: false,
      },
      data: { isRead: true },
    });

    await client.join(`chat_${data.chatId}`);
    return { ok: true };
  }

  @SubscribeMessage('chat:message:send')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string; content: string },
  ) {
    const user = client.data.user;
    if (!user) throw new ForbiddenException('Not authenticated');
    if (!data.content || data.content.trim() === '') {
      throw new ForbiddenException('Empty message');
    }

    const chat = await this.prisma.chat.findUnique({ where: { id: data.chatId } });
    if (!chat || (chat.participant1Id !== user.sub && chat.participant2Id !== user.sub)) {
      throw new ForbiddenException('Access denied');
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        chatId: data.chatId,
        senderId: user.sub,
        content: data.content,
      },
      include: {
        sender: { select: { id: true, name: true, companyName: true, avatarPath: true } },
      },
    });

    await this.prisma.chat.update({
      where: { id: data.chatId },
      data: { updatedAt: new Date() },
    });

    this.chatsRealtime.emitNewMessage(data.chatId, message);

    // Notify the other participant
    const otherUserId = chat.participant1Id === user.sub ? chat.participant2Id : chat.participant1Id;
    
    const notification = await this.notificationsService.create({
      userId: otherUserId,
      type: 'CHAT_MESSAGE',
      title: 'Нове повідомлення',
      message: `Від ${message.sender.name}: ${message.content}`,
      link: `/chats/${data.chatId}`,
    });

    this.server.to(`user_${otherUserId}`).emit('notification:chat_message', {
      chatId: data.chatId,
      senderName: message.sender.name,
      content: message.content,
      notification,
    });

    return { ok: true, message };
  }
}
