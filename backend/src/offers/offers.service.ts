import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OfferStatus, OfferTurn, SystemEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InvitesService } from '../invites/invites.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CounterOfferDto } from './dto/counter-offer.dto';
import { ProposePriceDto } from './dto/propose-price.dto';
import { UpdateOfferStatusDto } from './dto/update-offer-status.dto';
import { RejectOfferDto } from './dto/reject-offer.dto';
import { OffersRealtimeService } from '../realtime/offers-realtime.service';

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
  skuId: string | null;
  buyerId: string | null;
  productName: string | null;
  category: string | null;
  isNovelty: boolean;
  vendorId: string;
  initiatorRole: 'BUYER' | 'VENDOR';
  currentPrice: string;
  volume: number;
  unit: string;
  deliveryTerms: string | null;
  status: OfferStatus;
  currentTurn: OfferTurn;
  createdAt: Date;
  updatedAt: Date;
}

export interface OfferDetailDto extends OfferDto {
  sku: { id: string; name: string; category: string; targetPrice: string | null; createdBy: { id: string; name: string; companyName: string } } | null;
  buyer: { id: string; name: string; companyName: string } | null;
  vendor: { id: string; name: string; companyName: string };
}

export interface OfferListItemDto extends OfferDto {
  sku: { name: string };
  vendor: { name: string; companyName: string };
  buyer?: { name: string; companyName: string };
}

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invitesService: InvitesService,
    private readonly realtime: OffersRealtimeService,
  ) {}

  async create(dto: CreateOfferDto, vendorId: string): Promise<OfferDto> {
    const linkedBuyerIds = await this.invitesService.getLinkedBuyerIds(vendorId);
    const volumeInt = parseInt(dto.volume, 10);

    if (dto.skuId) {
      const sku = await this.prisma.sku.findUnique({ where: { id: dto.skuId } });
      if (!sku) throw new NotFoundException('SKU not found');
      if (!linkedBuyerIds.includes(sku.createdById)) {
        throw new ForbiddenException('You can only create offers for SKUs of buyers who have invited you');
      }
      const offer = await this.prisma.offer.create({
        data: {
          skuId: dto.skuId,
          vendorId,
          initiatorRole: 'VENDOR',
          currentPrice: dto.currentPrice,
          volume: volumeInt,
          unit: dto.unit ?? 'item',
          deliveryTerms: dto.deliveryTerms ?? null,
          status: OfferStatus.NEW,
          currentTurn: OfferTurn.BUYER,
        },
      });
      
      this.realtime.emitNotificationToUser(sku.createdById, 'notification:offer_update', {
        offerId: offer.id,
        action: 'NEW_OFFER',
        message: `Нова пропозиція від постачальника на товар: ${sku.name}`,
      });
      
      return this.toDto(offer);
    }

    if (dto.buyerId && dto.productName?.trim()) {
      if (!linkedBuyerIds.includes(dto.buyerId)) {
        throw new ForbiddenException('You can only send offers to buyers who have invited you');
      }
      const offer = await this.prisma.offer.create({
        data: {
          buyerId: dto.buyerId,
          productName: dto.productName.trim(),
          category: dto.category?.trim() ?? null,
          isNovelty: true,
          vendorId,
          initiatorRole: 'VENDOR',
          currentPrice: dto.currentPrice,
          volume: volumeInt,
          unit: dto.unit ?? 'item',
          deliveryTerms: dto.deliveryTerms ?? null,
          status: OfferStatus.NEW,
          currentTurn: OfferTurn.BUYER,
        },
      });
      
      this.realtime.emitNotificationToUser(dto.buyerId, 'notification:offer_update', {
        offerId: offer.id,
        action: 'NEW_OFFER',
        message: `Нова пропозиція від постачальника (Свій товар): ${dto.productName.trim()}`,
      });
      
      return this.toDto(offer);
    }

    throw new BadRequestException('Provide either skuId or buyerId with productName');
  }

  async findAllForUser(userId: string, role: 'BUYER' | 'VENDOR'): Promise<OfferListItemDto[]> {
    const include = {
      sku: { select: { name: true, createdBy: { select: { name: true, companyName: true } } } },
      buyer: { select: { name: true, companyName: true } },
      vendor: { select: { name: true, companyName: true } },
    };

    if (role === 'VENDOR') {
      const offers = await this.prisma.offer.findMany({
        where: { vendorId: userId },
        orderBy: { createdAt: 'desc' },
        include,
      });
      return offers.map((o) => this.toListItemDto(o));
    }

    const offers = await this.prisma.offer.findMany({
      where: {
        OR: [{ sku: { createdById: userId } }, { buyerId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include,
    });
    return offers.map((o) => this.toListItemDto(o));
  }

  private toListItemDto(
    o: {
      id: string;
      skuId: string | null;
      buyerId: string | null;
      productName: string | null;
      category: string | null;
      isNovelty: boolean;
      vendorId: string;
      initiatorRole: 'BUYER' | 'VENDOR';
      currentPrice: unknown;
      volume: number;
      unit: string;
      deliveryTerms: string | null;
      status: OfferStatus;
      currentTurn: OfferTurn;
      createdAt: Date;
      updatedAt: Date;
      sku: { name: string; createdBy: { name: string; companyName: string } } | null;
      buyer: { name: string; companyName: string } | null;
      vendor: { name: string; companyName: string };
    },
  ): OfferListItemDto {
    return {
      ...this.toDto(o),
      sku: { name: o.sku?.name ?? o.productName ?? '—' },
      vendor: o.vendor,
      buyer: o.buyer ?? (o.sku?.createdBy ? { name: o.sku.createdBy.name, companyName: o.sku.createdBy.companyName } : undefined),
    };
  }

  async getOne(offerId: string, userId: string, role: 'BUYER' | 'VENDOR'): Promise<OfferDetailDto> {
    await this.ensureParticipant(offerId, userId, role);
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        sku: { include: { createdBy: { select: { id: true, name: true, companyName: true } } } },
        buyer: { select: { id: true, name: true, companyName: true } },
        vendor: { select: { id: true, name: true, companyName: true } },
      },
    });
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }
    const buyer =
      offer.buyer ??
      (offer.sku?.createdBy ? { id: offer.sku.createdBy.id, name: offer.sku.createdBy.name, companyName: offer.sku.createdBy.companyName } : null);

    return {
      ...this.toDto(offer),
      sku: offer.sku
        ? {
            id: offer.sku.id,
            name: offer.sku.name,
            category: offer.sku.category,
            targetPrice: offer.sku.targetPrice != null ? String(offer.sku.targetPrice) : null,
            createdBy: offer.sku.createdBy,
          }
        : null,
      buyer,
      vendor: offer.vendor,
    };
  }

  /** Проверяет, что пользователь — участник оффера (закупщик по SKU/buyerId или поставщик). */
  private async ensureParticipant(
    offerId: string,
    userId: string,
    role: 'BUYER' | 'VENDOR',
  ): Promise<{ id: string; skuId: string | null; buyerId: string | null; vendorId: string; currentPrice: unknown; volume: number; unit: string; status: OfferStatus; currentTurn: OfferTurn; sku: { createdById: string } | null }> {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { sku: true },
    });
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }
    const isVendor = role === 'VENDOR' && offer.vendorId === userId;
    const isBuyer =
      role === 'BUYER' && (offer.buyerId === userId || (offer.sku != null && offer.sku.createdById === userId));
    if (!isVendor && !isBuyer) {
      throw new ForbiddenException('You are not a participant of this offer');
    }
    return offer as {
      id: string;
      skuId: string | null;
      buyerId: string | null;
      vendorId: string;
      currentPrice: unknown;
      volume: number;
      unit: string;
      status: OfferStatus;
      currentTurn: OfferTurn;
      sku: { createdById: string } | null;
    };
  }

  async getMessages(
    offerId: string,
    userId: string,
    role: 'BUYER' | 'VENDOR',
  ): Promise<OfferMessageDto[]> {
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

    // Ensure access: user must be participant of each offerId.
    // MVP: filter only those offers where user is participant.
    const offers = await this.prisma.offer.findMany({
      where:
        role === 'VENDOR'
          ? { id: { in: ids }, vendorId: userId }
          : { id: { in: ids }, OR: [{ buyerId: userId }, { sku: { createdById: userId } }] },
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
    
    const messageDto = {
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

    // Notify the other participant
    const otherUserId = role === 'VENDOR' ? (offer.buyerId || offer.sku?.createdById) : offer.vendorId;
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
    const nextTurn = isBuyer ? OfferTurn.VENDOR : OfferTurn.BUYER;
    const oldPrice = String(offer.currentPrice);
    const newPrice = dto.newPrice;

    const { updatedOffer, message } = await this.prisma.$transaction(async (tx) => {
      const createdMessage = await tx.offerMessage.create({
        data: {
          offerId: offer.id,
          senderId: userId,
          isSystemEvent: true,
          eventType: SystemEventType.PRICE_CHANGED,
          metaData: { oldPrice, newPrice },
        },
        include: {
          sender: { select: { id: true, name: true, companyName: true } },
        },
      });
      const updatedOffer = await tx.offer.update({
        where: { id: offer.id },
        data: {
          currentPrice: newPrice,
          status: OfferStatus.COUNTER_OFFER,
          currentTurn: nextTurn,
        },
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
    
    const otherUserId = role === 'VENDOR' ? (offer.buyerId || offer.sku?.createdById) : offer.vendorId;
    if (otherUserId) {
      this.realtime.emitNotificationToUser(otherUserId, 'notification:offer_update', {
        offerId: offer.id,
        action: 'COUNTER_OFFER',
        message: `Запропонована нова ціна: ${newPrice} грн`,
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
        data: { status: OfferStatus.ACCEPTED },
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
    
    const otherUserId = role === 'VENDOR' ? (offer.buyerId || offer.sku?.createdById) : offer.vendorId;
    if (otherUserId) {
      this.realtime.emitNotificationToUser(otherUserId, 'notification:offer_update', {
        offerId: offer.id,
        action: 'ACCEPTED',
        message: `Угоду погоджено`,
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
    
    const otherUserId = role === 'VENDOR' ? (offer.buyerId || offer.sku?.createdById) : offer.vendorId;
    if (otherUserId) {
      this.realtime.emitNotificationToUser(otherUserId, 'notification:offer_update', {
        offerId: offer.id,
        action: 'REJECTED',
        message: `Угоду відхилено. Причина: ${dto.reason}`,
      });
    }

    return this.toDto(updatedOffer);
  }

  async counterOffer(
    offerId: string,
    userId: string,
    role: 'BUYER' | 'VENDOR',
    dto: CounterOfferDto,
  ): Promise<OfferDto> {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { sku: true },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const isBuyer = role === 'BUYER';
    const isVendor = role === 'VENDOR';
    const buyerId = offer.sku?.createdById ?? offer.buyerId;

    if (isVendor && offer.vendorId !== userId) {
      throw new ForbiddenException('Cannot modify other vendor offer');
    }

    if (isBuyer && buyerId !== userId) {
      throw new ForbiddenException('Cannot modify this offer');
    }

    if (isBuyer && offer.currentTurn !== OfferTurn.BUYER) {
      throw new ForbiddenException('It is not buyer turn');
    }

    if (isVendor && offer.currentTurn !== OfferTurn.VENDOR) {
      throw new ForbiddenException('It is not vendor turn');
    }

    const nextTurn = isBuyer ? OfferTurn.VENDOR : OfferTurn.BUYER;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.offerHistory.create({
        data: {
          offerId: offer.id,
          previousPrice: offer.currentPrice,
          newPrice: dto.newPrice,
          comment: dto.comment,
          createdById: userId,
        },
      });

      return tx.offer.update({
        where: { id: offer.id },
        data: {
          currentPrice: dto.newPrice,
          status: OfferStatus.COUNTER_OFFER,
          currentTurn: nextTurn,
        },
      });
    });

    return this.toDto(updated);
  }

  async updateStatus(
    offerId: string,
    userId: string,
    role: 'BUYER' | 'VENDOR',
    dto: UpdateOfferStatusDto,
  ): Promise<OfferDto> {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { sku: true },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const isBuyer = role === 'BUYER';
    const isVendor = role === 'VENDOR';
    const buyerId = offer.sku?.createdById ?? offer.buyerId;

    if (isVendor && offer.vendorId !== userId) {
      throw new ForbiddenException('Cannot modify other vendor offer');
    }

    if (isBuyer && buyerId !== userId) {
      throw new ForbiddenException('Cannot modify this offer');
    }

    if (dto.status === OfferStatus.ACCEPTED || dto.status === OfferStatus.REJECTED) {
      if (isBuyer && offer.currentTurn !== OfferTurn.BUYER) {
        throw new ForbiddenException('It is not buyer turn');
      }

      if (isVendor && offer.currentTurn !== OfferTurn.VENDOR) {
        throw new ForbiddenException('It is not vendor turn');
      }
    }

    const updated = await this.prisma.offer.update({
      where: { id: offerId },
      data: {
        status: dto.status,
      },
    });

    return this.toDto(updated);
  }

  private toDto(offer: {
    id: string;
    skuId: string | null;
    buyerId: string | null;
    productName: string | null;
    category: string | null;
    isNovelty: boolean;
    vendorId: string;
    initiatorRole: 'BUYER' | 'VENDOR';
    currentPrice: unknown;
    volume: number;
    unit: string;
    deliveryTerms: string | null;
    status: OfferStatus;
    currentTurn: OfferTurn;
    createdAt: Date;
    updatedAt: Date;
  }): OfferDto {
    return {
      id: offer.id,
      skuId: offer.skuId,
      buyerId: offer.buyerId,
      productName: offer.productName,
      category: offer.category,
      isNovelty: offer.isNovelty,
      vendorId: offer.vendorId,
      initiatorRole: offer.initiatorRole,
      currentPrice: String(offer.currentPrice),
      volume: offer.volume,
      unit: offer.unit,
      deliveryTerms: offer.deliveryTerms,
      status: offer.status,
      currentTurn: offer.currentTurn,
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt,
    };
  }
}

