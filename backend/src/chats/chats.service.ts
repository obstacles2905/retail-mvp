import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatsRealtimeService } from '../realtime/chats-realtime.service';

export interface ChatListDto {
  id: string;
  participant: {
    id: string;
    name: string;
    companyName: string;
    avatarPath: string | null;
  };
  lastMessage: {
    content: string;
    createdAt: Date;
    senderId: string;
  } | null;
  unreadCount: number;
}

@Injectable()
export class ChatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatsRealtime: ChatsRealtimeService,
  ) {}

  async createOrGetChat(userId: string, targetParticipantId: string) {
    if (userId === targetParticipantId) {
      throw new ForbiddenException('Cannot create chat with yourself');
    }

    const p1 = userId < targetParticipantId ? userId : targetParticipantId;
    const p2 = userId < targetParticipantId ? targetParticipantId : userId;

    let chat = await this.prisma.chat.findUnique({
      where: {
        participant1Id_participant2Id: {
          participant1Id: p1,
          participant2Id: p2,
        },
      },
    });

    if (!chat) {
      chat = await this.prisma.chat.create({
        data: {
          participant1Id: p1,
          participant2Id: p2,
        },
      });
    }

    return this.getChatDetails(chat.id, userId);
  }

  async getChatDetails(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participant1: { select: { id: true, name: true, companyName: true, avatarPath: true } },
        participant2: { select: { id: true, name: true, companyName: true, avatarPath: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.participant1Id !== userId && chat.participant2Id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const otherParticipant = chat.participant1Id === userId ? chat.participant2 : chat.participant1;

    return {
      id: chat.id,
      participant: otherParticipant,
      messages: chat.messages,
    };
  }

  async listChats(userId: string): Promise<ChatListDto[]> {
    const chats = await this.prisma.chat.findMany({
      where: {
        OR: [{ participant1Id: userId }, { participant2Id: userId }],
      },
      include: {
        participant1: { select: { id: true, name: true, companyName: true, avatarPath: true } },
        participant2: { select: { id: true, name: true, companyName: true, avatarPath: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            messages: {
              where: {
                senderId: { not: userId },
                isRead: false,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return chats.map(c => {
      const otherParticipant = c.participant1Id === userId ? c.participant2 : c.participant1;
      return {
        id: c.id,
        participant: otherParticipant,
        lastMessage: c.messages[0] ? {
          content: c.messages[0].content,
          createdAt: c.messages[0].createdAt,
          senderId: c.messages[0].senderId,
        } : null,
        unreadCount: c._count.messages,
      };
    });
  }

  async sendMessage(chatId: string, senderId: string, content: string) {
    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.participant1Id !== senderId && chat.participant2Id !== senderId) {
      throw new ForbiddenException('Access denied');
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        chatId,
        senderId,
        content,
      },
      include: {
        sender: { select: { id: true, name: true, companyName: true, avatarPath: true } },
      },
    });

    await this.prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    this.chatsRealtime.emitNewMessage(chatId, message);

    return message;
  }

  async markAsRead(chatId: string, userId: string) {
    await this.prisma.chatMessage.updateMany({
      where: {
        chatId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });
  }
}
