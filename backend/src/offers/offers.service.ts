import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OfferStatus, OfferTurn, SystemEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InvitesService } from '../invites/invites.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { ProposePriceDto } from './dto/propose-price.dto';
import { RejectOfferDto } from './dto/reject-offer.dto';
import { OffersRealtimeService } from '../realtime/offers-realtime.service';

export interface OfferItemDto {
  id: string;
  skuId: string | null;
  productName: string | null;
  category: string | null;
  isNovelty: boolean;
  currentPrice: string;
  volume: number;
  unit: string;
  sku: { id: string; name: string; uom: string; category: string; targetPrice: string | null; createdBy: { id: string; name: string; companyName: string } } | null;
}

export interface OfferMessageDto {
  id: string;
  offerId: string;
  senderId: string;
  content: string | null;
  isSystemEvent: boolean;
  eventType: SystemEventType | null;
  metaData: Record<string, unknown> | null;
  createdAt: Date;
  sender?: { id: string; name: string; companyName: string };
}

export interface OfferDto {
  id: string;
  buyerId: string | null;
  vendorId: string;
  initiatorRole: 'BUYER' | 'VENDOR';
  deliveryTerms: string | null;
  deliveryDate: string | null;
  status: OfferStatus;
  currentTurn: OfferTurn;
  acceptedAt: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: OfferItemDto[];
}

export interface OfferDetailDto extends OfferDto {
  buyer: { id: string; name: string; companyName: string } | null;
  vendor: { id: string; name: string; companyName: string };
}

export interface OfferListItemDto extends OfferDto {
  vendor: { id: string; name: string; companyName: string };
  buyer: { id: string; name: string; companyName: string } | null;
  hasUnread: boolean;
}

const ITEMS_INCLUDE = {
  sku: {
    select: {
      id: true,
      name: true,
      uom: true,
      category: true,
      targetPrice: true,
      createdBy: { select: { id: true, name: true, companyName: true } },
    },
  },
} as const;

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invitesService: InvitesService,
    private readonly realtime: OffersRealtimeService,
  ) {}

  async create(dto: CreateOfferDto, vendorId: string): Promise<OfferDto> {
    const linkedBuyerIds = await this.invitesService.getLinkedBuyerIds(vendorId);

    let buyerId: string | null = null;
    let workspaceId: string | null = null;

    for (const item of dto.items) {
      if (item.skuId) {
        const sku = await this.prisma.sku.findUnique({ where: { id: item.skuId } });
        if (!sku) throw new NotFoundException(`SKU not found: ${item.skuId}`);
        if (!linkedBuyerIds.includes(sku.createdById)) {
          throw new ForbiddenException('You can only create offers for SKUs of buyers who have invited you');
        }
        if (buyerId && buyerId !== sku.createdById) {
          throw new BadRequestException('All SKU items must belong to the same buyer');
        }
        if (workspaceId && workspaceId !== sku.workspaceId) {
          throw new BadRequestException('All SKU items must belong to the same workspace');
        }
        buyerId = sku.createdById;
        workspaceId = sku.workspaceId;
      } else if (item.productName?.trim()) {
        if (dto.buyerId && !linkedBuyerIds.includes(dto.buyerId)) {
          throw new ForbiddenException('You can only send offers to buyers who have invited you');
        }
      } else {
        throw new BadRequestException('Each item must have either skuId or productName');
      }
    }

    if (!buyerId) buyerId = dto.buyerId ?? null;
    if (!buyerId) throw new BadRequestException('Cannot determine buyer — provide buyerId or use SKU items');
    if (!workspaceId) {
      const buyer = await this.prisma.user.findUnique({
        where: { id: buyerId },
        select: { workspaceId: true },
      });
      workspaceId = buyer?.workspaceId ?? null;
    }
    if (!workspaceId) {
      throw new BadRequestException('Buyer workspace is required to create offer');
    }

    const offer = await this.prisma.$transaction(async (tx) => {
      const created = await tx.offer.create({
        data: {
          buyerId,
          workspaceId,
          vendorId,
          initiatorRole: 'VENDOR',
          deliveryTerms: dto.deliveryTerms ?? null,
          deliveryDate: new Date(dto.deliveryDate),
          status: OfferStatus.NEW,
          currentTurn: OfferTurn.BUYER,
          items: {
            create: dto.items.map((item) => ({
              skuId: item.skuId ?? null,
              productName: item.skuId ? null : item.productName?.trim() ?? null,
              category: item.skuId ? null : item.category?.trim() ?? null,
              isNovelty: !item.skuId,
              currentPrice: item.currentPrice,
              volume: parseInt(item.volume, 10),
              unit: item.unit ?? 'item',
            })),
          },
        },
        include: { items: { include: ITEMS_INCLUDE } },
      });
      return created;
    });

    const firstItemName = offer.items[0]?.sku?.name ?? offer.items[0]?.productName ?? 'Товар';
    const itemsLabel = offer.items.length > 1 ? ` та ще ${offer.items.length - 1}` : '';
    const newOfferPayload = {
      offerId: offer.id,
      action: 'NEW_OFFER',
      message: `Нова пропозиція від постачальника: ${firstItemName}${itemsLabel}`,
    };
    this.realtime.emitNotificationToUser(buyerId!, 'notification:offer_update', newOfferPayload);
    // Creator (vendor) must refresh their own sidebar — they are not the buyer recipient above.
    this.realtime.emitNotificationToUser(vendorId, 'notification:offer_update', {
      ...newOfferPayload,
      message: 'Пропозицію створено',
    });

    return this.toDto(offer);
  }

  async findAllForUser(
    userId: string,
    role: 'BUYER' | 'VENDOR',
    workspaceId: string | null,
    options?: {
      status?: OfferStatus | OfferStatus[];
      showArchived?: boolean;
      counterpartyName?: string;
      sortBy?: 'createdAt' | 'acceptedAt';
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<OfferListItemDto[]> {
    const include = {
      items: { include: ITEMS_INCLUDE },
      buyer: { select: { id: true, name: true, companyName: true } },
      vendor: { select: { id: true, name: true, companyName: true } },
    };

    if (role === 'BUYER' && !workspaceId) {
      return [];
    }

    const whereClause: any = role === 'VENDOR'
      ? { vendorId: userId }
      : { workspaceId };

    if (!options?.showArchived) {
      whereClause.isArchived = false;
    }

    if (options?.status) {
      if (Array.isArray(options.status)) {
        whereClause.status = { in: options.status };
      } else {
        whereClause.status = options.status;
      }
    }

    if (options?.counterpartyName?.trim()) {
      const search = options.counterpartyName.trim();
      const nameFilter = { contains: search, mode: 'insensitive' as const };
      if (role === 'BUYER') {
        whereClause.vendor = {
          OR: [{ name: nameFilter }, { companyName: nameFilter }],
        };
      } else {
        whereClause.buyer = {
          OR: [{ name: nameFilter }, { companyName: nameFilter }],
        };
      }
    }

    const sortField = options?.sortBy ?? 'createdAt';
    const sortOrder = options?.sortOrder ?? 'desc';
    const orderBy: any = sortField === 'acceptedAt'
      ? { acceptedAt: { sort: sortOrder, nulls: 'last' as const } }
      : { [sortField]: sortOrder };

    const offers = await this.prisma.offer.findMany({
      where: whereClause,
      orderBy,
      include,
    });

    const unreadCounts = await this.getUnreadCounts(offers.map(o => o.id), userId, role);

    return offers.map((o) => ({
      ...this.toDto(o),
      vendor: o.vendor,
      buyer: o.buyer ?? null,
      hasUnread: (unreadCounts[o.id] || 0) > 0,
    }));
  }

  async getOne(offerId: string, userId: string, role: 'BUYER' | 'VENDOR'): Promise<OfferDetailDto> {
    await this.ensureParticipant(offerId, userId, role);
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        items: { include: ITEMS_INCLUDE },
        buyer: { select: { id: true, name: true, companyName: true } },
        vendor: { select: { id: true, name: true, companyName: true } },
      },
    });
    if (!offer) throw new NotFoundException('Offer not found');

    return {
      ...this.toDto(offer),
      buyer: offer.buyer ?? null,
      vendor: offer.vendor,
    };
  }

  private async ensureParticipant(
    offerId: string,
    userId: string,
    role: 'BUYER' | 'VENDOR',
  ): Promise<{ id: string; buyerId: string | null; vendorId: string; status: OfferStatus; currentTurn: OfferTurn }> {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
    });
    if (!offer) throw new NotFoundException('Offer not found');

    const isVendor = role === 'VENDOR' && offer.vendorId === userId;
    const isBuyer = role === 'BUYER' && offer.buyerId === userId;
    if (!isVendor && !isBuyer) {
      throw new ForbiddenException('You are not a participant of this offer');
    }
    return offer;
  }

  async getMessages(offerId: string, userId: string, role: 'BUYER' | 'VENDOR'): Promise<OfferMessageDto[]> {
    await this.ensureParticipant(offerId, userId, role);
    const messages = await this.prisma.offerMessage.findMany({
      where: { offerId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, companyName: true } },
      },
    });
    return messages.map((m) => ({
      id: m.id,
      offerId: m.offerId,
      senderId: m.senderId,
      content: m.content,
      isSystemEvent: m.isSystemEvent,
      eventType: m.eventType,
      metaData: m.metaData as Record<string, unknown> | null,
      createdAt: m.createdAt,
      sender: m.sender,
    }));
  }

  async markRead(offerId: string, userId: string, role: 'BUYER' | 'VENDOR'): Promise<void> {
    await this.ensureParticipant(offerId, userId, role);
    await this.prisma.offerReadState.upsert({
      where: { offerId_userId: { offerId, userId } },
      create: { offerId, userId, lastReadAt: new Date() },
      update: { lastReadAt: new Date() },
    });
  }

  async getUnreadCounts(
    offerIds: string[],
    userId: string,
    role: 'BUYER' | 'VENDOR',
  ): Promise<Record<string, number>> {
    const ids = offerIds.filter(Boolean);
    if (ids.length === 0) return {};

    const offers = await this.prisma.offer.findMany({
      where:
        role === 'VENDOR'
          ? { id: { in: ids }, vendorId: userId }
          : { id: { in: ids }, buyerId: userId },
      select: { id: true },
    });
    const allowedIds = offers.map((o) => o.id);

    const states = await this.prisma.offerReadState.findMany({
      where: { userId, offerId: { in: allowedIds } },
      select: { offerId: true, lastReadAt: true },
    });
    const stateMap = new Map(states.map((s) => [s.offerId, s.lastReadAt] as const));
    const epoch = new Date(0);

    const counts = await Promise.all(
      allowedIds.map(async (id) => {
        const lastReadAt = stateMap.get(id) ?? epoch;
        const count = await this.prisma.offerMessage.count({
          where: {
            offerId: id,
            createdAt: { gt: lastReadAt },
            senderId: { not: userId },
          },
        });
        return [id, count] as const;
      }),
    );

    return Object.fromEntries(counts);
  }

  async sendMessage(
    offerId: string,
    userId: string,
    role: 'BUYER' | 'VENDOR',
    dto: CreateMessageDto,
  ): Promise<OfferMessageDto> {
    const offer = await this.ensureParticipant(offerId, userId, role);
    const message = await this.prisma.offerMessage.create({
      data: {
        offerId,
        senderId: userId,
        content: dto.content,
        isSystemEvent: false,
      },
      include: {
        sender: { select: { id: true, name: true, companyName: true } },
      },
    });

    const messageDto: OfferMessageDto = {
      id: message.id,
      offerId: message.offerId,
      senderId: message.senderId,
      content: message.content,
      isSystemEvent: message.isSystemEvent,
      eventType: message.eventType,
      metaData: message.metaData as Record<string, unknown> | null,
      createdAt: message.createdAt,
      sender: message.sender,
    };

    const otherUserId = role === 'VENDOR' ? offer.buyerId : offer.vendorId;
    if (otherUserId) {
      this.realtime.emitNotificationToUser(otherUserId, 'notification:offer_message', {
        offerId,
        senderName: message.sender.name,
        message: `Від ${message.sender.name}: ${message.content || 'Файл/Подія'}`,
      });
    }

    return messageDto;
  }

  async proposePrice(
    offerId: string,
    userId: string,
    role: 'BUYER' | 'VENDOR',
    dto: ProposePriceDto,
  ): Promise<OfferDto> {
    const offer = await this.ensureParticipant(offerId, userId, role);
    if (offer.status === OfferStatus.ACCEPTED || offer.status === OfferStatus.REJECTED) {
      throw new ForbiddenException('Cannot change price for closed offer');
    }
    const isBuyer = role === 'BUYER';
    const isVendor = role === 'VENDOR';
    if (isBuyer && offer.currentTurn !== OfferTurn.BUYER) {
      throw new ForbiddenException('It is not buyer turn');
    }
    if (isVendor && offer.currentTurn !== OfferTurn.VENDOR) {
      throw new ForbiddenException('It is not vendor turn');
    }

    const existingItems = await this.prisma.offerItem.findMany({
      where: { offerId, id: { in: dto.items.map(i => i.itemId) } },
      include: { sku: { select: { name: true } } },
    });
    if (existingItems.length !== dto.items.length) {
      throw new BadRequestException('Some item IDs are invalid');
    }
    const itemMap = new Map(existingItems.map(i => [i.id, i]));

    const priceChanges = dto.items.map(({ itemId, newPrice }) => {
      const item = itemMap.get(itemId)!;
      return {
        itemId,
        productName: item.sku?.name ?? item.productName ?? 'Товар',
        oldPrice: String(item.currentPrice),
        newPrice,
      };
    });

    const nextTurn = isBuyer ? OfferTurn.VENDOR : OfferTurn.BUYER;

    const { updatedOffer, message } = await this.prisma.$transaction(async (tx) => {
      for (const { itemId, newPrice } of dto.items) {
        await tx.offerItem.update({
          where: { id: itemId },
          data: { currentPrice: newPrice },
        });
      }

      const createdMessage = await tx.offerMessage.create({
        data: {
          offerId: offer.id,
          senderId: userId,
          isSystemEvent: true,
          eventType: SystemEventType.PRICE_CHANGED,
          metaData: { items: priceChanges },
        },
        include: {
          sender: { select: { id: true, name: true, companyName: true } },
        },
      });

      const updatedOffer = await tx.offer.update({
        where: { id: offer.id },
        data: {
          status: OfferStatus.COUNTER_OFFER,
          currentTurn: nextTurn,
        },
        include: { items: { include: ITEMS_INCLUDE } },
      });
      return { updatedOffer, message: createdMessage };
    });

    const messageDto: OfferMessageDto = {
      id: message.id,
      offerId: message.offerId,
      senderId: message.senderId,
      content: message.content,
      isSystemEvent: message.isSystemEvent,
      eventType: message.eventType,
      metaData: message.metaData as Record<string, unknown> | null,
      createdAt: message.createdAt,
      sender: message.sender,
    };
    this.realtime.emitNewMessage(offer.id, messageDto);

    const otherUserId = role === 'VENDOR' ? offer.buyerId : offer.vendorId;
    if (otherUserId) {
      const summary = priceChanges.map(p => `${p.productName}: ${p.newPrice} грн`).join(', ');
      this.realtime.emitNotificationToUser(otherUserId, 'notification:offer_update', {
        offerId: offer.id,
        action: 'COUNTER_OFFER',
        message: `Нові ціни: ${summary}`,
      });
    }

    return this.toDto(updatedOffer);
  }

  async acceptDeal(offerId: string, userId: string, role: 'BUYER' | 'VENDOR'): Promise<OfferDto> {
    const offer = await this.ensureParticipant(offerId, userId, role);
    if (offer.status === OfferStatus.ACCEPTED || offer.status === OfferStatus.REJECTED) {
      throw new ForbiddenException('Offer is already closed');
    }
    const isBuyer = role === 'BUYER';
    const isVendor = role === 'VENDOR';
    if (isBuyer && offer.currentTurn !== OfferTurn.BUYER) {
      throw new ForbiddenException('It is not buyer turn');
    }
    if (isVendor && offer.currentTurn !== OfferTurn.VENDOR) {
      throw new ForbiddenException('It is not vendor turn');
    }

    const { updatedOffer, message } = await this.prisma.$transaction(async (tx) => {
      const createdMessage = await tx.offerMessage.create({
        data: {
          offerId: offer.id,
          senderId: userId,
          isSystemEvent: true,
          eventType: SystemEventType.DEAL_ACCEPTED,
        },
        include: {
          sender: { select: { id: true, name: true, companyName: true } },
        },
      });
      const updatedOffer = await tx.offer.update({
        where: { id: offer.id },
        data: { status: OfferStatus.AWAITING_DELIVERY, acceptedAt: new Date() },
        include: { items: { include: ITEMS_INCLUDE } },
      });
      return { updatedOffer, message: createdMessage };
    });

    const dto: OfferMessageDto = {
      id: message.id,
      offerId: message.offerId,
      senderId: message.senderId,
      content: message.content,
      isSystemEvent: message.isSystemEvent,
      eventType: message.eventType,
      metaData: message.metaData as Record<string, unknown> | null,
      createdAt: message.createdAt,
      sender: message.sender,
    };
    this.realtime.emitNewMessage(offer.id, dto);

    const otherUserId = role === 'VENDOR' ? offer.buyerId : offer.vendorId;
    if (otherUserId) {
      this.realtime.emitNotificationToUser(otherUserId, 'notification:offer_update', {
        offerId: offer.id,
        action: 'ACCEPTED',
        message: 'Угоду погоджено',
      });
    }

    return this.toDto(updatedOffer);
  }

  async rejectDeal(
    offerId: string,
    userId: string,
    role: 'BUYER' | 'VENDOR',
    dto: RejectOfferDto,
  ): Promise<OfferDto> {
    const offer = await this.ensureParticipant(offerId, userId, role);
    if (offer.status === OfferStatus.ACCEPTED || offer.status === OfferStatus.REJECTED) {
      throw new ForbiddenException('Offer is already closed');
    }

    const { updatedOffer, message } = await this.prisma.$transaction(async (tx) => {
      const createdMessage = await tx.offerMessage.create({
        data: {
          offerId: offer.id,
          senderId: userId,
          isSystemEvent: true,
          eventType: SystemEventType.TERMS_UPDATED,
          metaData: { action: 'REJECTED', reason: dto.reason },
        },
        include: {
          sender: { select: { id: true, name: true, companyName: true } },
        },
      });
      const updatedOffer = await tx.offer.update({
        where: { id: offer.id },
        data: { status: OfferStatus.REJECTED },
        include: { items: { include: ITEMS_INCLUDE } },
      });
      return { updatedOffer, message: createdMessage };
    });

    const messageDto: OfferMessageDto = {
      id: message.id,
      offerId: message.offerId,
      senderId: message.senderId,
      content: message.content,
      isSystemEvent: message.isSystemEvent,
      eventType: message.eventType,
      metaData: message.metaData as Record<string, unknown> | null,
      createdAt: message.createdAt,
      sender: message.sender,
    };
    this.realtime.emitNewMessage(offer.id, messageDto);

    const otherUserId = role === 'VENDOR' ? offer.buyerId : offer.vendorId;
    if (otherUserId) {
      this.realtime.emitNotificationToUser(otherUserId, 'notification:offer_update', {
        offerId: offer.id,
        action: 'REJECTED',
        message: `Угоду відхилено. Причина: ${dto.reason}`,
      });
    }

    return this.toDto(updatedOffer);
  }

  async deliverOffer(offerId: string, userId: string, role: 'BUYER' | 'VENDOR'): Promise<OfferDto> {
    if (role !== 'BUYER') {
      throw new ForbiddenException('Only the buyer can confirm delivery');
    }
    const offer = await this.ensureParticipant(offerId, userId, role);
    if (offer.status !== OfferStatus.AWAITING_DELIVERY) {
      throw new ForbiddenException('Can only mark as delivered when status is AWAITING_DELIVERY');
    }

    const { updatedOffer, message } = await this.prisma.$transaction(async (tx) => {
      const createdMessage = await tx.offerMessage.create({
        data: {
          offerId: offer.id,
          senderId: userId,
          isSystemEvent: true,
          eventType: SystemEventType.DELIVERY_CONFIRMED,
        },
        include: {
          sender: { select: { id: true, name: true, companyName: true } },
        },
      });
      const updatedOffer = await tx.offer.update({
        where: { id: offer.id },
        data: { status: OfferStatus.DELIVERED },
        include: { items: { include: ITEMS_INCLUDE } },
      });
      return { updatedOffer, message: createdMessage };
    });

    const dto: OfferMessageDto = {
      id: message.id,
      offerId: message.offerId,
      senderId: message.senderId,
      content: message.content,
      isSystemEvent: message.isSystemEvent,
      eventType: message.eventType,
      metaData: message.metaData as Record<string, unknown> | null,
      createdAt: message.createdAt,
      sender: message.sender,
    };
    this.realtime.emitNewMessage(offer.id, dto);

    this.realtime.emitNotificationToUser(offer.vendorId, 'notification:offer_update', {
      offerId: offer.id,
      action: 'DELIVERED',
      message: 'Доставку підтверджено закупником',
    });

    return this.toDto(updatedOffer);
  }

  async archiveOffer(offerId: string, userId: string, role: 'BUYER' | 'VENDOR'): Promise<OfferDto> {
    const offer = await this.ensureParticipant(offerId, userId, role);
    const terminalStatuses: OfferStatus[] = [OfferStatus.DELIVERED, OfferStatus.REJECTED];
    if (!terminalStatuses.includes(offer.status)) {
      throw new ForbiddenException('Can only archive orders with terminal status (DELIVERED or REJECTED)');
    }

    const nowArchived = !(offer as any).isArchived;
    const updatedOffer = await this.prisma.offer.update({
      where: { id: offerId },
      data: {
        isArchived: nowArchived,
        archivedAt: nowArchived ? new Date() : null,
      },
      include: { items: { include: ITEMS_INCLUDE } },
    });

    const otherUserId = role === 'VENDOR' ? offer.buyerId : offer.vendorId;
    if (otherUserId) {
      this.realtime.emitNotificationToUser(otherUserId, 'notification:offer_update', {
        offerId: offer.id,
        action: nowArchived ? 'ARCHIVED' : 'UNARCHIVED',
        message: nowArchived ? 'Угоду архівовано' : 'Угоду повернуто з архіву',
      });
    }
    // Archiver does not get a socket notification (avoids duplicate DB notification + toast).
    // Layout DealSidebar refetches on pathname / visibility / client "offers:refresh" event.

    return this.toDto(updatedOffer);
  }

  async rescheduleDelivery(
    offerId: string,
    userId: string,
    role: 'BUYER' | 'VENDOR',
    newDate: Date,
  ): Promise<OfferDto> {
    const offer = await this.ensureParticipant(offerId, userId, role);
    if (offer.status !== OfferStatus.AWAITING_DELIVERY) {
      throw new ForbiddenException('Can only reschedule when awaiting delivery');
    }

    const { updatedOffer, message } = await this.prisma.$transaction(async (tx) => {
      const createdMessage = await tx.offerMessage.create({
        data: {
          offerId: offer.id,
          senderId: userId,
          isSystemEvent: true,
          eventType: SystemEventType.DELIVERY_RESCHEDULED,
          metaData: { newDate: newDate.toISOString() },
        },
        include: {
          sender: { select: { id: true, name: true, companyName: true } },
        },
      });
      const updatedOffer = await tx.offer.update({
        where: { id: offer.id },
        data: { deliveryDate: newDate },
        include: { items: { include: ITEMS_INCLUDE } },
      });
      return { updatedOffer, message: createdMessage };
    });

    const dto: OfferMessageDto = {
      id: message.id,
      offerId: message.offerId,
      senderId: message.senderId,
      content: message.content,
      isSystemEvent: message.isSystemEvent,
      eventType: message.eventType,
      metaData: message.metaData as Record<string, unknown> | null,
      createdAt: message.createdAt,
      sender: message.sender,
    };
    this.realtime.emitNewMessage(offer.id, dto);

    const otherUserId = role === 'VENDOR' ? offer.buyerId : offer.vendorId;
    if (otherUserId) {
      this.realtime.emitNotificationToUser(otherUserId, 'notification:offer_update', {
        offerId: offer.id,
        action: 'DELIVERY_RESCHEDULED',
        message: `Дата доставки змінена на ${newDate.toLocaleDateString('uk-UA')}`,
      });
    }

    return this.toDto(updatedOffer);
  }

  private toItemDto(item: {
    id: string;
    skuId: string | null;
    productName: string | null;
    category: string | null;
    isNovelty: boolean;
    currentPrice: unknown;
    volume: number;
    unit: string;
    sku: { id: string; name: string; uom: string; category: string; targetPrice: unknown | null; createdBy: { id: string; name: string; companyName: string } } | null;
  }): OfferItemDto {
    return {
      id: item.id,
      skuId: item.skuId,
      productName: item.productName,
      category: item.category,
      isNovelty: item.isNovelty,
      currentPrice: String(item.currentPrice),
      volume: item.volume,
      unit: item.unit,
      sku: item.sku
        ? {
            id: item.sku.id,
            name: item.sku.name,
            uom: item.sku.uom,
            category: item.sku.category,
            targetPrice: item.sku.targetPrice != null ? String(item.sku.targetPrice) : null,
            createdBy: item.sku.createdBy,
          }
        : null,
    };
  }

  private toDto(offer: {
    id: string;
    buyerId: string | null;
    vendorId: string;
    initiatorRole: 'BUYER' | 'VENDOR';
    deliveryTerms: string | null;
    deliveryDate: Date | null;
    status: OfferStatus;
    currentTurn: OfferTurn;
    acceptedAt?: Date | null;
    isArchived?: boolean;
    archivedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    items: any[];
  }): OfferDto {
    return {
      id: offer.id,
      buyerId: offer.buyerId,
      vendorId: offer.vendorId,
      initiatorRole: offer.initiatorRole,
      deliveryTerms: offer.deliveryTerms,
      deliveryDate: offer.deliveryDate ? offer.deliveryDate.toISOString() : null,
      status: offer.status,
      currentTurn: offer.currentTurn,
      acceptedAt: offer.acceptedAt ? offer.acceptedAt.toISOString() : null,
      isArchived: offer.isArchived ?? false,
      archivedAt: offer.archivedAt ? offer.archivedAt.toISOString() : null,
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt,
      items: (offer.items ?? []).map((item: any) => this.toItemDto(item)),
    };
  }
}
