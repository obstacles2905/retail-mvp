import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvitesService } from '../invites/invites.service';
import { CreateSkuDto } from './dto/create-sku.dto';
import * as xlsx from 'xlsx';

export interface SkuDto {
  id: string;
  name: string;
  categoryId: string | null;
  category?: { id: string; name: string };
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

  async create(createSkuDto: CreateSkuDto, buyerId: string, workspaceId: string | null): Promise<SkuDto> {
    if (!workspaceId) {
      throw new BadRequestException('Buyer workspace is required to create SKU');
    }

    if (createSkuDto.categoryId) {
      await this.ensureCategoryInWorkspace(createSkuDto.categoryId, workspaceId);
    }

    const sku = await this.prisma.sku.create({
      data: {
        name: createSkuDto.name,
        categoryId: createSkuDto.categoryId ?? null,
        uom: createSkuDto.uom,
        articleCode: createSkuDto.articleCode ?? null,
        barcode: createSkuDto.barcode ?? null,
        targetPrice: createSkuDto.targetPrice ? createSkuDto.targetPrice : null,
        createdById: buyerId,
        workspaceId,
      },
      include: { category: { select: { id: true, name: true } } },
    });

    return this.toDto(sku);
  }

  async importSkus(buffer: Buffer, buyerId: string, workspaceId: string | null) {
    if (!workspaceId) {
      throw new BadRequestException('Buyer workspace is required to import SKUs');
    }

    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet);

    let importedCount = 0;
    let failedCount = 0;

    const skusToCreate: Array<{
      name: string;
      categoryId: string | null;
      uom: string;
      articleCode: string | null;
      barcode: string | null;
      targetPrice: number | null;
      createdById: string;
      workspaceId: string;
    }> = [];

    const normalizedCategoryNames = new Set<string>();
    const originalCategoryNamesByNormalized = new Map<string, string>();

    for (const row of rows) {
      const name = row['Назва'] || row['Name'];
      const category = row['Категорія'] || row['Category'];
      
      if (!name || !category) {
        failedCount++;
        continue;
      }

      const normalizedCategoryName = this.normalizeCategoryName(String(category));
      if (!normalizedCategoryName) {
        failedCount++;
        continue;
      }

      normalizedCategoryNames.add(normalizedCategoryName);
      if (!originalCategoryNamesByNormalized.has(normalizedCategoryName)) {
        originalCategoryNamesByNormalized.set(normalizedCategoryName, String(category).trim());
      }
    }

    const categoryMap = await this.ensureImportCategories(
      workspaceId,
      normalizedCategoryNames,
      originalCategoryNamesByNormalized,
    );

    for (const row of rows) {
      const name = row['Назва'] || row['Name'];
      const category = row['Категорія'] || row['Category'];

      if (!name || !category) {
        continue;
      }

      const normalizedCategoryName = this.normalizeCategoryName(String(category));
      if (!normalizedCategoryName) {
        continue;
      }

      const categoryId = categoryMap.get(normalizedCategoryName) ?? null;
      const uom = row['Одиниця виміру'] || row['UOM'] || 'item';
      const articleCode = row['Артикул'] || row['ArticleCode'] ? String(row['Артикул'] || row['ArticleCode']) : null;
      const barcode = row['Штрихкод'] || row['Barcode'] ? String(row['Штрихкод'] || row['Barcode']) : null;
      
      const targetPriceRaw = row['Цільова ціна'] || row['TargetPrice'];
      let targetPrice: number | null = null;
      if (targetPriceRaw) {
        const parsed = parseFloat(String(targetPriceRaw).replace(',', '.'));
        if (!isNaN(parsed)) {
          targetPrice = parsed;
        }
      }

      skusToCreate.push({
        name: String(name),
        categoryId,
        uom: String(uom),
        articleCode,
        barcode,
        targetPrice,
        createdById: buyerId,
        workspaceId,
      });
    }

    if (skusToCreate.length > 0) {
      await this.prisma.sku.createMany({
        data: skusToCreate,
      });
      importedCount = skusToCreate.length;
    }

    return { importedCount, failedCount };
  }

  /** Для BUYER — тільки свої неархівовані SKU. Для VENDOR — тільки неархівовані SKU закупників, які запросили цього постачальника. */
  async findAll(userId: string, role: 'BUYER' | 'VENDOR', workspaceId: string | null): Promise<SkuDto[]> {
    if (role === 'BUYER') {
      if (!workspaceId) {
        return [];
      }

      const skus = await this.prisma.sku.findMany({
        where: { workspaceId, isArchived: false },
        orderBy: { createdAt: 'desc' },
        include: { category: { select: { id: true, name: true } } },
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
      include: {
        createdBy: { select: { id: true, companyName: true } },
        category: { select: { id: true, name: true } },
      },
    });
    return skus.map((sku) => ({ ...this.toDto(sku), createdBy: sku.createdBy }));
  }

  async update(id: string, dto: Partial<CreateSkuDto>, buyerId: string): Promise<SkuDto> {
    const sku = await this.prisma.sku.findUnique({ where: { id } });
    if (!sku || sku.createdById !== buyerId) {
      throw new Error('SKU not found or access denied');
    }

    if (dto.categoryId) {
      await this.ensureCategoryInWorkspace(dto.categoryId, sku.workspaceId);
    }

    const updated = await this.prisma.sku.update({
      where: { id },
      data: {
        name: dto.name,
        categoryId: dto.categoryId,
        uom: dto.uom,
        articleCode: dto.articleCode,
        barcode: dto.barcode,
        targetPrice: dto.targetPrice,
      },
      include: { category: { select: { id: true, name: true } } },
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
      include: { category: { select: { id: true, name: true } } },
    });

    return skus.map((sku) => this.toDto(sku));
  }

  private toDto(sku: {
    id: string;
    name: string;
    categoryId: string | null;
    category?: { id: string; name: string } | null;
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
      categoryId: sku.categoryId,
      category: sku.category ?? undefined,
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

  private normalizeCategoryName(name: string): string {
    return name.trim().toLowerCase();
  }

  private async ensureCategoryInWorkspace(categoryId: string, workspaceId: string | null): Promise<void> {
    if (!workspaceId) {
      throw new BadRequestException('Workspace is required');
    }

    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, workspaceId },
      select: { id: true },
    });

    if (!category) {
      throw new BadRequestException('Category not found in workspace');
    }
  }

  private async ensureImportCategories(
    workspaceId: string,
    normalizedCategoryNames: Set<string>,
    originalCategoryNamesByNormalized: Map<string, string>,
  ): Promise<Map<string, string>> {
    if (normalizedCategoryNames.size === 0) {
      return new Map<string, string>();
    }

    const normalizedNames = Array.from(normalizedCategoryNames);

    const existingCategories = await this.prisma.category.findMany({
      where: {
        workspaceId,
        normalizedName: { in: normalizedNames },
      },
      select: { id: true, normalizedName: true },
    });

    const categoryMap = new Map<string, string>();
    for (const category of existingCategories) {
      categoryMap.set(category.normalizedName, category.id);
    }

    for (const normalizedName of normalizedNames) {
      if (categoryMap.has(normalizedName)) {
        continue;
      }

      const nameToCreate = originalCategoryNamesByNormalized.get(normalizedName) ?? normalizedName;

      try {
        const created = await this.prisma.category.create({
          data: {
            name: nameToCreate,
            normalizedName,
            workspaceId,
          },
          select: { id: true, normalizedName: true },
        });
        categoryMap.set(created.normalizedName, created.id);
      } catch {
        const existing = await this.prisma.category.findUnique({
          where: {
            workspaceId_normalizedName: {
              workspaceId,
              normalizedName,
            },
          },
          select: { id: true, normalizedName: true },
        });

        if (existing) {
          categoryMap.set(existing.normalizedName, existing.id);
        }
      }
    }

    return categoryMap;
  }
}

