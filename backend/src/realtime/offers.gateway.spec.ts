import { ForbiddenException } from '@nestjs/common';
import type { Socket } from 'socket.io';
import { OffersGateway } from './offers.gateway';
import type { OffersRealtimeService } from './offers-realtime.service';
import type { OffersService, OfferMessageDto } from '../offers/offers.service';

describe('OffersGateway', () => {
  it('joinOffer joins room when participant', async () => {
    expect.assertions(2);
    const offerId = 'offerId';
    const sub = 'userId';
    const role = 'BUYER' as const;

    const offersService = {
      getOne: jest.fn().mockResolvedValue({}),
    } as unknown as OffersService;

    const realtime = { setServer: jest.fn(), emitNewMessage: jest.fn() } as unknown as OffersRealtimeService;

    const gateway = new OffersGateway(offersService, realtime);
    const client = {
      data: { user: { sub, role } },
      join: jest.fn().mockResolvedValue(undefined),
    } as unknown as Socket;

    const res = await gateway.joinOffer(client, { offerId });
    expect(offersService.getOne).toHaveBeenCalledWith(offerId, sub, role);
    expect(res).toEqual({ ok: true });
  });

  it('sendMessage emits offers:message:new after persisting', async () => {
    expect.assertions(3);
    const offerId = 'offerId';
    const sub = 'userId';
    const role = 'BUYER' as const;
    const content = 'hello';
    const message: OfferMessageDto = {
      id: 'm1',
      offerId,
      senderId: sub,
      content,
      isSystemEvent: false,
      eventType: null,
      metaData: null,
      createdAt: new Date(),
      sender: { id: sub, name: 'Name', companyName: 'Company' },
    };

    const offersService = {
      sendMessage: jest.fn().mockResolvedValue(message),
    } as unknown as OffersService;

    const realtime = { setServer: jest.fn(), emitNewMessage: jest.fn() } as unknown as OffersRealtimeService;

    const gateway = new OffersGateway(offersService, realtime);
    const client = {
      data: { user: { sub, role } },
    } as unknown as Socket;

    const res = await gateway.sendMessage(client, { offerId, content });
    expect(offersService.sendMessage).toHaveBeenCalled();
    expect((realtime as unknown as { emitNewMessage: jest.Mock }).emitNewMessage).toHaveBeenCalledWith(offerId, message);
    expect(res.ok).toBe(true);
  });

  it('sendMessage rejects empty content', async () => {
    expect.assertions(1);
    const offerId = 'offerId';
    const sub = 'userId';
    const role = 'BUYER' as const;
    const offersService = { sendMessage: jest.fn() } as unknown as OffersService;
    const realtime = { setServer: jest.fn(), emitNewMessage: jest.fn() } as unknown as OffersRealtimeService;
    const gateway = new OffersGateway(offersService, realtime);
    const client = { data: { user: { sub, role } } } as unknown as Socket;

    await expect(gateway.sendMessage(client, { offerId, content: '' })).rejects.toBeInstanceOf(ForbiddenException);
  });
});

