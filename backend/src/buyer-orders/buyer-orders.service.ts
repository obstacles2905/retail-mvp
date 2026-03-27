import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OfferStatus, OfferTurn, SystemEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InvitesService } from '../invites/invites.service';
import { CreateBuyerOrderDto } from './dto/create-buyer-order.dto';
import { OfferDto, OfferListItemDto } from '../offers/offers.service';
import { OffersRealtimeService } from '../realtime/offers-realtime.service';

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
export class BuyerOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invitesService: InvitesService,
    private readonly realtime: OffersRealtimeService,
  ) {}

  async createAndBroadcast(
    buyerId: string,
    workspaceId: string | null,
    dto: CreateBuyerOrderDto,
  ): Promise<OfferDto[]> {
    if (dto.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }
    if (!workspaceId) {
      throw new BadRequestException('Buyer workspace is required to create order');
    }

    const linkedVendorIds = await this.invitesService.getLinkedVendorIds(buyerId);
    const invalidVendorId = dto.vendorIds.find((id) => !linkedVendorIds.includes(id));
    if (invalidVendorId) {
      throw new ForbiddenException('You can only send orders to vendors from your contacts');
    }

    for (const item of dto.items) {
      if (item.skuId) {
        const sku = await this.prisma.sku.findUnique({ where: { id: item.skuId } });
        if (!sku) throw new NotFoundException(`SKU not found: ${item.skuId}`);
        if (sku.createdById !== buyerId) {
          throw new ForbiddenException('You can only create orders for your own SKUs');
        }
      } else if (!item.productName?.trim()) {
        throw new BadRequestException('Each item must have either skuId or productName');
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const offers = await Promise.all(
        dto.vendorIds.map(async (vendorId) => {
          const offer = await tx.offer.create({
            data: {
              buyerId,
              workspaceId,
              vendorId,
              initiatorRole: 'BUYER',
              deliveryTerms: dto.deliveryTerms ?? null,
              deliveryDate: new Date(dto.deliveryDate),
              status: OfferStatus.NEW,
              currentTurn: OfferTurn.VENDOR,
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

          await tx.offerMessage.create({
            data: {
              offerId: offer.id,
              senderId: buyerId,
              isSystemEvent: true,
              eventType: SystemEventType.TERMS_UPDATED,
              metaData: { action: 'BUYER_ORDER_CREATED' },
            },
          });

          return offer;
        }),
      );
      return offers;
    });

    const firstItemName = dto.items[0]?.productName ?? 'Товар з каталогу';
    const itemsLabel = dto.items.length > 1 ? ` та ще ${dto.items.length - 1}` : '';
    for (const offer of created) {
      this.realtime.emitNotificationToUser(offer.vendorId, 'notification:offer_update', {
        offerId: offer.id,
        action: 'BUYER_ORDER_CREATED',
        message: `Нове замовлення від закупника: ${firstItemName}${itemsLabel}`,
      });
    }
    // Buyer (initiator) must refresh their sidebar — vendors were notified above.
    if (created.length > 0 && created[0].buyerId) {
      this.realtime.emitNotificationToUser(created[0].buyerId, 'notification:offer_update', {
        offerId: created[0].id,
        action: 'BUYER_ORDER_SENT',
        message:
          created.length > 1
            ? `Замовлення надіслано ${created.length} постачальникам`
            : 'Замовлення надіслано постачальнику',
      });
    }

    return created.map((o) => this.toOfferDto(o));
  }

  async listBuyerOrders(buyerId: string): Promise<OfferListItemDto[]> {
    const offers = await this.prisma.offer.findMany({
      where: { buyerId, initiatorRole: 'BUYER' },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: ITEMS_INCLUDE },
        buyer: { select: { id: true, name: true, companyName: true } },
        vendor: { select: { id: true, name: true, companyName: true } },
      },
    });

    return offers.map((o) => ({
      ...this.toOfferDto(o),
      vendor: o.vendor,
      buyer: o.buyer ?? null,
      hasUnread: false,
    }));
  }

  private toOfferDto(o: {
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
    buyerArchived?: boolean;
    vendorArchived?: boolean;
    archivedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    items: any[];
  }): OfferDto {
    return {
      id: o.id,
      buyerId: o.buyerId,
      vendorId: o.vendorId,
      initiatorRole: o.initiatorRole,
      deliveryTerms: o.deliveryTerms,
      deliveryDate: o.deliveryDate ? o.deliveryDate.toISOString() : null,
      status: o.status,
      currentTurn: o.currentTurn,
      acceptedAt: o.acceptedAt ? o.acceptedAt.toISOString() : null,
      isArchived: o.isArchived ?? false,
      buyerArchived: o.buyerArchived ?? false,
      vendorArchived: o.vendorArchived ?? false,
      archivedAt: o.archivedAt ? o.archivedAt.toISOString() : null,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      items: (o.items ?? []).map((item: any) => ({
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
      })),
    };
  }
}
