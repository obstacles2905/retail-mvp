import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import type { OfferMessageDto } from '../offers/offers.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OffersRealtimeService {
  private server: Server | null = null;

  constructor(private readonly notificationsService: NotificationsService) {}

  setServer(server: Server): void {
    this.server = server;
  }

  emitNewMessage(offerId: string, message: OfferMessageDto): void {
    if (!this.server) return;
    this.server.to(offerId).emit('offers:message:new', message);
  }

  async emitNotificationToUser(userId: string, event: string, payload: any): Promise<void> {
    if (!this.server) return;
    
    let type: any = 'SYSTEM';
    let title = 'Сповіщення';
    let link = undefined;
    
    if (event === 'notification:offer_message') {
      type = 'OFFER_MESSAGE';
      title = 'Нове повідомлення в угоді';
      link = `/offers/${payload.offerId}`;
    } else if (event === 'notification:offer_update') {
      type = 'OFFER_UPDATE';
      title = 'Оновлення по угоді';
      link = `/offers/${payload.offerId}`;
    }

    const notification = await this.notificationsService.create({
      userId,
      type,
      title,
      message: payload.message || payload.content || 'Нова подія',
      link,
    });

    this.server.to(`user_${userId}`).emit(event, { ...payload, notification });
  }
}

