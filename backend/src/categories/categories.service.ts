import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(workspaceId: string | null) {
    if (!workspaceId) {
      return [];
    }

    const categories = await this.prisma.category.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: { skus: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      normalizedName: cat.normalizedName,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
      skuCount: cat._count.skus,
    }));
  }

  async createOrGet(name: string, workspaceId: string | null) {
    if (!workspaceId) {
      throw new BadRequestException('User workspace is required to create category');
    }

    const normalizedName = this.normalizeName(name);
    if (!normalizedName) {
      throw new BadRequestException('Category name is required');
    }

    const existing = await this.prisma.category.findUnique({
      where: {
        workspaceId_normalizedName: {
          workspaceId,
          normalizedName,
        },
      },
    });
    if (existing) {
      return existing;
    }

    try {
      return await this.prisma.category.create({
        data: {
          name: name.trim(),
          normalizedName,
          workspaceId,
        },
      });
    } catch {
      const alreadyCreated = await this.prisma.category.findUnique({
        where: {
          workspaceId_normalizedName: {
            workspaceId,
            normalizedName,
          },
        },
      });

      if (alreadyCreated) {
        return alreadyCreated;
      }

      throw new BadRequestException('Failed to create category');
    }
  }

  async getSkus(categoryId: string, workspaceId: string | null, page: number, limit: number) {
    if (!workspaceId) {
      throw new BadRequestException('User workspace is required');
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.sku.findMany({
        where: { categoryId, workspaceId, isArchived: false },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.sku.count({
        where: { categoryId, workspaceId, isArchived: false },
      }),
    ]);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, name: string, workspaceId: string | null) {
    if (!workspaceId) {
      throw new BadRequestException('User workspace is required');
    }

    const normalizedName = this.normalizeName(name);
    if (!normalizedName) {
      throw new BadRequestException('Category name is required');
    }

    const existing = await this.prisma.category.findUnique({
      where: {
        workspaceId_normalizedName: {
          workspaceId,
          normalizedName,
        },
      },
    });

    if (existing && existing.id !== id) {
      throw new BadRequestException('Категорія з такою назвою вже існує');
    }

    return this.prisma.category.update({
      where: { id, workspaceId },
      data: {
        name: name.trim(),
        normalizedName,
      },
    });
  }

  async delete(id: string, workspaceId: string | null) {
    if (!workspaceId) {
      throw new BadRequestException('User workspace is required');
    }

    const category = await this.prisma.category.findUnique({
      where: { id, workspaceId },
      include: {
        _count: {
          select: { skus: true },
        },
      },
    });

    if (!category) {
      throw new BadRequestException('Category not found');
    }

    if (category._count.skus > 0) {
      throw new BadRequestException('Неможливо видалити категорію, яка містить товари');
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }

  normalizeName(name: string): string {
    return name.trim().toLowerCase();
  }
}
