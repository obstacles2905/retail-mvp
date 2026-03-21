import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvitesService } from '../invites/invites.service';
import { CreateSkuDto } from './dto/create-sku.dto';

export interface SkuDto {
  id: string;
  name: string;
  category: string;
  uom: string;
  articleCode: string | null;
  barcode: string | null;
  targetPrice: string | null;
  isArchived: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  /** Для VENDOR: дані закупника — власника SKU. */
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
        uom: createSkuDto.uom,
        articleCode: createSkuDto.articleCode ?? null,
        barcode: createSkuDto.barcode ?? null,
        targetPrice: createSkuDto.targetPrice ? createSkuDto.targetPrice : null,
        createdById: buyerId,
      },
    });

    return this.toDto(sku);
  }

  /** Для BUYER — тільки свої неархівовані SKU. Для VENDOR — тільки неархівовані SKU закупників, які запросили цього постачальника. */
  async findAll(userId: string, role: 'BUYER' | 'VENDOR'): Promise<SkuDto[]> {
    if (role === 'BUYER') {
      const skus = await this.prisma.sku.findMany({
        where: { createdById: userId, isArchived: false },
        orderBy: { createdAt: 'desc' },
      });
      return skus.map((sku) => this.toDto(sku));
    }

    const linkedBuyerIds = await this.invitesService.getLinkedBuyerIds(userId);
    if (linkedBuyerIds.length === 0) {
      return [];
    }
    const skus = await this.prisma.sku.findMany({
      where: { createdById: { in: linkedBuyerIds }, isArchived: false },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { id: true, companyName: true } } },
    });
    return skus.map((sku) => ({ ...this.toDto(sku), createdBy: sku.createdBy }));
  }

  async update(id: string, dto: Partial<CreateSkuDto>, buyerId: string): Promise<SkuDto> {
    const sku = await this.prisma.sku.findUnique({ where: { id } });
    if (!sku || sku.createdById !== buyerId) {
      throw new Error('SKU not found or access denied');
    }

    const updated = await this.prisma.sku.update({
      where: { id },
      data: {
        name: dto.name,
        category: dto.category,
        uom: dto.uom,
        articleCode: dto.articleCode,
        barcode: dto.barcode,
        targetPrice: dto.targetPrice,
      },
    });
    return this.toDto(updated);
  }

  async archive(id: string, buyerId: string): Promise<SkuDto> {
    const sku = await this.prisma.sku.findUnique({ where: { id } });
    if (!sku || sku.createdById !== buyerId) {
      throw new Error('SKU not found or access denied');
    }

    const updated = await this.prisma.sku.update({
      where: { id },
      data: { isArchived: true },
    });
    return this.toDto(updated);
  }

  async search(query: string, buyerId: string, userId: string, role: 'BUYER' | 'VENDOR'): Promise<SkuDto[]> {
    if (role === 'VENDOR') {
      const linkedBuyerIds = await this.invitesService.getLinkedBuyerIds(userId);
      if (!linkedBuyerIds.includes(buyerId)) {
        throw new Error('Access denied to this buyer catalog');
      }
    } else if (role === 'BUYER' && buyerId !== userId) {
      throw new Error('Access denied to other buyer catalog');
    }

    const skus = await this.prisma.sku.findMany({
      where: {
        createdById: buyerId,
        isArchived: false,
        name: { contains: query, mode: 'insensitive' },
      },
      take: 20,
      orderBy: { name: 'asc' },
    });

    return skus.map((sku) => this.toDto(sku));
  }

  private toDto(sku: {
    id: string;
    name: string;
    category: string;
    uom: string;
    articleCode: string | null;
    barcode: string | null;
    targetPrice: unknown;
    isArchived: boolean;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
  }): SkuDto {
    return {
      id: sku.id,
      name: sku.name,
      category: sku.category,
      uom: sku.uom,
      articleCode: sku.articleCode,
      barcode: sku.barcode,
      targetPrice: sku.targetPrice !== null ? String(sku.targetPrice) : null,
      isArchived: sku.isArchived,
      createdById: sku.createdById,
      createdAt: sku.createdAt,
      updatedAt: sku.updatedAt,
    };
  }
}

