import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvitesService } from '../invites/invites.service';
import { CreateSkuDto } from './dto/create-sku.dto';

export interface SkuDto {
  id: string;
  name: string;
  category: string;
  targetPrice: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  /** Для VENDOR: данные закупщика — владельца SKU (чтобы выбирать «кому оффер»). */
  createdBy?: { id: string; companyName: string };
}

@Injectable()
export class SkuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invitesService: InvitesService,
  ) {}

  async create(createSkuDto: CreateSkuDto, buyerId: string): Promise<SkuDto> {
    const sku = await this.prisma.sku.create({
      data: {
        name: createSkuDto.name,
        category: createSkuDto.category,
        targetPrice: createSkuDto.targetPrice ? createSkuDto.targetPrice : null,
        createdById: buyerId,
      },
    });

    return this.toDto(sku);
  }

  /** Для BUYER — только свои SKU. Для VENDOR — только SKU закупщиков, которые пригласили этого поставщика. */
  async findAll(userId: string, role: 'BUYER' | 'VENDOR'): Promise<SkuDto[]> {
    if (role === 'BUYER') {
      const skus = await this.prisma.sku.findMany({
        where: { createdById: userId },
        orderBy: { createdAt: 'desc' },
      });
      return skus.map((sku) => this.toDto(sku));
    }

    const linkedBuyerIds = await this.invitesService.getLinkedBuyerIds(userId);
    if (linkedBuyerIds.length === 0) {
      return [];
    }
    const skus = await this.prisma.sku.findMany({
      where: { createdById: { in: linkedBuyerIds } },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { id: true, companyName: true } } },
    });
    return skus.map((sku) => ({ ...this.toDto(sku), createdBy: sku.createdBy }));
  }

  private toDto(sku: {
    id: string;
    name: string;
    category: string;
    targetPrice: unknown;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
  }): SkuDto {
    return {
      id: sku.id,
      name: sku.name,
      category: sku.category,
      targetPrice: sku.targetPrice !== null ? String(sku.targetPrice) : null,
      createdById: sku.createdById,
      createdAt: sku.createdAt,
      updatedAt: sku.updatedAt,
    };
  }
}

