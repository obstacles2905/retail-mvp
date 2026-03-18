import { ForbiddenException, UseGuards } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OffersService, OfferMessageDto } from '../offers/offers.service';
import { CreateMessageDto } from '../offers/dto/create-message.dto';
import { OffersRealtimeService } from './offers-realtime.service';
import { WsJwtGuard, WsAuthUser } from './ws-jwt.guard';

class JoinOfferDto {
  offerId!: string;
}

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
@UseGuards(WsJwtGuard)
export class OffersGateway {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly offersService: OffersService,
    private readonly realtime: OffersRealtimeService,
  ) {}

  afterInit(): void {
    this.realtime.setServer(this.server);
  }

  @SubscribeMessage('offers:join')
  async joinOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: JoinOfferDto,
  ): Promise<{ ok: true }> {
    const user = client.data.user as WsAuthUser | undefined;
    if (!user) throw new ForbiddenException('Unauthorized');
    const offerId = typeof body?.offerId === 'string' ? body.offerId : '';
    if (!offerId) throw new ForbiddenException('Invalid offerId');

    await this.offersService.getOne(offerId, user.sub, user.role);
    await this.offersService.markRead(offerId, user.sub, user.role);
    await client.join(offerId);
    return { ok: true };
  }

  @SubscribeMessage('offers:message:send')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { offerId: string; content: string },
  ): Promise<{ ok: true; message: OfferMessageDto }> {
    const user = client.data.user as WsAuthUser | undefined;
    if (!user) throw new ForbiddenException('Unauthorized');

    const offerId = typeof body?.offerId === 'string' ? body.offerId : '';
    const content = typeof body?.content === 'string' ? body.content : '';
    const dto = plainToInstance(CreateMessageDto, { content });
    const errors = await validate(dto);
    if (errors.length > 0) {
      throw new ForbiddenException('Invalid message');
    }

    const message = await this.offersService.sendMessage(offerId, user.sub, user.role, dto);
    this.realtime.emitNewMessage(offerId, message);
    return { ok: true, message };
  }
}

