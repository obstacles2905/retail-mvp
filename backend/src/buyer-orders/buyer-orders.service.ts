import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OfferStatus, OfferTurn, SystemEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InvitesService } from '../invites/invites.service';
import { CreateBuyerOrderDto } from './dto/create-buyer-order.dto';
import { OfferDto, OfferListItemDto } from '../offers/offers.service';

@Injectable()
export class BuyerOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invitesService: InvitesService,
  ) {}

  async createAndBroadcast(buyerId: string, dto: CreateBuyerOrderDto): Promise<OfferDto[]> {
    if (!dto.skuId && !dto.productName?.trim()) {
      throw new BadRequestException('Provide either skuId or productName');
    }

    const linkedVendorIds = await this.invitesService.getLinkedVendorIds(buyerId);
    const invalidVendorId = dto.vendorIds.find((id) => !linkedVendorIds.includes(id));
    if (invalidVendorId) {
      throw new ForbiddenException('You can only send orders to vendors from your contacts');
    }

    const volumeInt = parseInt(dto.volume, 10);

    let skuId: string | null = null;
    let productName: string | null = null;

    if (dto.skuId) {
      const sku = await this.prisma.sku.findUnique({ where: { id: dto.skuId } });
      if (!sku) throw new NotFoundException('SKU not found');
      if (sku.createdById !== buyerId) {
        throw new ForbiddenException('You can only create orders for your own SKUs');
      }
      skuId = sku.id;
    } else {
      productName = dto.productName!.trim();
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const offers = await Promise.all(
        dto.vendorIds.map((vendorId) =>
          tx.offer.create({
            data: {
              skuId,
              buyerId,
              productName,
              vendorId,
              initiatorRole: 'BUYER',
              currentPrice: dto.targetPrice,
              volume: volumeInt,
              unit: dto.unit ?? 'item',
              deliveryTerms: dto.deliveryTerms ?? null,
              status: OfferStatus.NEW,
              currentTurn: OfferTurn.VENDOR,
            },
          }),
        ),
      );

      await Promise.all(
        offers.map((o) =>
          tx.offerMessage.create({
            data: {
              offerId: o.id,
              senderId: buyerId,
              isSystemEvent: true,
              eventType: SystemEventType.TERMS_UPDATED,
              metaData: { action: 'BUYER_ORDER_CREATED' },
            },
          }),
        ),
      );

      return offers;
    });

    return created.map((o) => this.toOfferDto(o));
  }

  async listBuyerOrders(buyerId: string): Promise<OfferListItemDto[]> {
    const offers = await this.prisma.offer.findMany({
      where: { buyerId, initiatorRole: 'BUYER' },
      orderBy: { createdAt: 'desc' },
      include: {
        sku: { select: { name: true } },
        buyer: { select: { name: true, companyName: true } },
        vendor: { select: { name: true, companyName: true } },
      },
    });

    return offers.map((o) => ({
      ...this.toOfferDto(o),
      sku: { name: o.sku?.name ?? o.productName ?? '—' },
      vendor: o.vendor,
      buyer: o.buyer ?? undefined,
    }));
  }

  private toOfferDto(o: {
    id: string;
    skuId: string | null;
    buyerId: string | null;
    productName: string | null;
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
      id: o.id,
      skuId: o.skuId,
      buyerId: o.buyerId,
      productName: o.productName,
      vendorId: o.vendorId,
      initiatorRole: o.initiatorRole,
      currentPrice: String(o.currentPrice),
      volume: o.volume,
      unit: o.unit,
      deliveryTerms: o.deliveryTerms,
      status: o.status,
      currentTurn: o.currentTurn,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  }
}

