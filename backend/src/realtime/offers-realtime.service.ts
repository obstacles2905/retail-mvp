import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import type { OfferMessageDto } from '../offers/offers.service';

@Injectable()
export class OffersRealtimeService {
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
  }

  emitNewMessage(offerId: string, message: OfferMessageDto): void {
    if (!this.server) return;
    this.server.to(offerId).emit('offers:message:new', message);
  }
}

