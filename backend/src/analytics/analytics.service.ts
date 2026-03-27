import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpis(workspaceId: string) {
    const totalOffers = await this.prisma.offer.count({ where: { workspaceId } });

    const offers = await this.prisma.offer.findMany({
      where: {
        workspaceId,
        status: { in: ['ACCEPTED', 'AWAITING_DELIVERY', 'DELIVERED'] },
      },
      include: { items: true },
    });

    let totalSaved = 0;
    let totalSpend = 0;
    let dealsClosed = offers.length;
    let reductionSum = 0;
    let reductionCount = 0;

    for (const offer of offers) {
      for (const item of offer.items) {
        if (item.savedAmount) {
          totalSaved += Number(item.savedAmount);
        }
        if (item.finalPrice) {
          totalSpend += Number(item.finalPrice) * item.volume;
        }
        const initial = Number(item.initialPrice);
        const final = Number(item.finalPrice);
        if (initial > 0 && final > 0) {
          reductionSum += ((initial - final) / initial) * 100;
          reductionCount += 1;
        }
      }
    }

    const avgPriceReduction = reductionCount > 0
      ? Math.round((reductionSum / reductionCount) * 100) / 100
      : 0;

    return {
      totalSaved,
      totalSpend,
      dealsClosed,
      totalOffers,
      avgPriceReduction,
    };
  }

  async getVendorsPerformance(workspaceId: string) {
    const allOffers = await this.prisma.offer.findMany({
      where: { workspaceId },
      include: {
        vendor: { select: { id: true, name: true, companyName: true } },
        items: true,
      },
    });

    const vendorStats = new Map<string, {
      vendorId: string;
      vendorName: string;
      vendorCompanyName: string;
      totalOffers: number;
      acceptedOffers: number;
      totalSaved: number;
    }>();

    for (const offer of allOffers) {
      const vId = offer.vendorId;
      if (!vendorStats.has(vId)) {
        vendorStats.set(vId, {
          vendorId: vId,
          vendorName: offer.vendor.name,
          vendorCompanyName: offer.vendor.companyName,
          totalOffers: 0,
          acceptedOffers: 0,
          totalSaved: 0,
        });
      }

      const stats = vendorStats.get(vId)!;
      stats.totalOffers += 1;

      if (['ACCEPTED', 'AWAITING_DELIVERY', 'DELIVERED'].includes(offer.status)) {
        stats.acceptedOffers += 1;
        for (const item of offer.items) {
          if (item.savedAmount) {
            stats.totalSaved += Number(item.savedAmount);
          }
        }
      }
    }

    const result = Array.from(vendorStats.values()).map(stats => ({
      ...stats,
      winRate: stats.totalOffers > 0 ? (stats.acceptedOffers / stats.totalOffers) * 100 : 0,
    }));

    return result.sort((a, b) => b.totalSaved - a.totalSaved);
  }

  async getExportData(workspaceId: string) {
    const offers = await this.prisma.offer.findMany({
      where: {
        workspaceId,
        status: { in: ['ACCEPTED', 'AWAITING_DELIVERY', 'DELIVERED'] },
      },
      include: {
        vendor: { select: { companyName: true } },
        items: { include: { sku: { select: { name: true } } } },
      },
      orderBy: { acceptedAt: 'desc' },
    });

    const rows: any[] = [];

    for (const offer of offers) {
      for (const item of offer.items) {
        rows.push({
          'ID Угоди': offer.id,
          'Дата погодження': offer.acceptedAt ? offer.acceptedAt.toISOString() : '',
          'Постачальник': offer.vendor.companyName,
          'Товар': item.sku?.name ?? item.productName ?? 'Невідомо',
          'Об\'єм': item.volume,
          'Одиниці': item.unit,
          'Початкова ціна': Number(item.initialPrice),
          'Фінальна ціна': Number(item.finalPrice),
          'Зекономлено': Number(item.savedAmount ?? 0),
        });
      }
    }

    return rows;
  }
}
