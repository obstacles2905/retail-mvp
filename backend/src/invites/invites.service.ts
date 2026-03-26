import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface InviteDto {
  id: string;
  token: string;
  inviteUrl: string;
  usedByVendorId: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface LinkedBuyerDto {
  buyerId: string;
  buyerName: string;
  buyerCompanyName: string;
}

export interface LinkedVendorDto {
  vendorId: string;
  vendorName: string;
  vendorCompanyName: string;
  email: string;
  phone: string | null;
}

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

@Injectable()
export class InvitesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(buyerId: string): Promise<InviteDto> {
    const buyer = await this.prisma.user.findUnique({
      where: { id: buyerId },
      select: { workspaceId: true },
    });
    if (!buyer) {
      throw new NotFoundException('User not found');
    }

    const token = randomUUID();
    const invite = await this.prisma.invite.create({
      data: {
        token,
        buyerId,
        workspaceId: buyer.workspaceId ?? null,
      },
    });
    return this.toDto(invite);
  }

  async findAllByBuyer(buyerId: string): Promise<InviteDto[]> {
    const invites = await this.prisma.invite.findMany({
      where: { buyerId },
      orderBy: { createdAt: 'desc' },
    });
    return invites.map((i) => this.toDto(i));
  }

  /** Проверяет токен: инвайт существует, не использован, не истёк. Возвращает invite или null. */
  async getMyInviteLink(buyerId: string): Promise<{ token: string; inviteUrl: string }> {
    let user = await this.prisma.user.findUnique({ where: { id: buyerId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.inviteToken) {
      const token = randomUUID();
      user = await this.prisma.user.update({
        where: { id: buyerId },
        data: { inviteToken: token },
      });
    }

    return {
      token: user.inviteToken!,
      inviteUrl: `${FRONTEND_URL}/join?token=${user.inviteToken}`,
    };
  }

  async validateToken(token: string): Promise<{ buyerId: string; buyerCompanyName: string } | null> {
    // 1. Check if token belongs to a User (reusable link)
    const buyer = await this.prisma.user.findUnique({
      where: { inviteToken: token },
      select: { id: true, companyName: true },
    });

    if (buyer) {
      return { buyerId: buyer.id, buyerCompanyName: buyer.companyName };
    }

    // 2. Fallback to old Invite model for backward compatibility
    const invite = await this.prisma.invite.findUnique({
      where: { token },
      include: { buyer: { select: { id: true, companyName: true } } },
    });
    if (!invite || invite.usedByVendorId != null) {
      return null;
    }
    if (invite.expiresAt != null && invite.expiresAt < new Date()) {
      return null;
    }
    return { buyerId: invite.buyer.id, buyerCompanyName: invite.buyer.companyName };
  }

  /** Отмечает инвайт как использованный поставщиком. Вызывается после регистрации. */
  async markAsUsed(token: string, vendorId: string): Promise<void> {
    // 1. Check if token is a reusable user token
    const buyer = await this.prisma.user.findUnique({
      where: { inviteToken: token },
    });

    if (buyer) {
      // Check if connection already exists
      const existing = await this.prisma.invite.findFirst({
        where: { buyerId: buyer.id, usedByVendorId: vendorId },
      });
      if (!existing) {
        await this.prisma.invite.create({
          data: {
            token: randomUUID(), // dummy unique token for DB constraint
            buyerId: buyer.id,
            usedByVendorId: vendorId,
            workspaceId: buyer.workspaceId,
          },
        });
      }
      return;
    }

    // 2. Fallback to old logic
    const invite = await this.prisma.invite.findUnique({
      where: { token },
    });
    if (!invite) {
      throw new NotFoundException('Invite not found');
    }
    if (invite.usedByVendorId != null) {
      if (invite.usedByVendorId === vendorId) return; // already connected
      throw new ForbiddenException('Invite already used');
    }
    if (invite.expiresAt != null && invite.expiresAt < new Date()) {
      throw new ForbiddenException('Invite expired');
    }
    await this.prisma.invite.update({
      where: { id: invite.id },
      data: { usedByVendorId: vendorId },
    });
  }

  /** Возвращает buyerIds, которые пригласили данного поставщика (по использованным инвайтам). */
  async getLinkedBuyerIds(vendorId: string): Promise<string[]> {
    const invites = await this.prisma.invite.findMany({
      where: { usedByVendorId: vendorId },
      select: { buyerId: true },
    });
    return invites.map((i) => i.buyerId);
  }

  /** Возвращает vendorIds, которые подключены к закупщику (по использованным инвайтам). */
  async getLinkedVendorIds(buyerId: string): Promise<string[]> {
    const invites = await this.prisma.invite.findMany({
      where: { buyerId, usedByVendorId: { not: null } },
      select: { usedByVendorId: true },
    });
    return invites.map((i) => i.usedByVendorId!).filter(Boolean);
  }

  /** Список закупщиков, к которым подключён поставщик (использованные инвайты с данными закупщика). */
  async findConnectionsForVendor(vendorId: string): Promise<LinkedBuyerDto[]> {
    const invites = await this.prisma.invite.findMany({
      where: { usedByVendorId: vendorId },
      include: { buyer: { select: { id: true, name: true, companyName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return invites.map((i) => ({
      buyerId: i.buyer.id,
      buyerName: i.buyer.name,
      buyerCompanyName: i.buyer.companyName,
    }));
  }

  /** Для закупщика: список поставщиков, которые подключились по его приглашениям. */
  async findConnectionsForBuyer(workspaceId: string | null): Promise<LinkedVendorDto[]> {
    if (!workspaceId) {
      return [];
    }

    const invites = await this.prisma.invite.findMany({
      where: { workspaceId, usedByVendorId: { not: null } },
      include: { usedByVendor: { select: { id: true, name: true, companyName: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const linkedVendors = invites
      .map((i) => i.usedByVendor)
      .filter((v): v is { id: string; name: string; companyName: string; email: string; phone: string | null } => v != null)
      .map((v) => ({ vendorId: v.id, vendorName: v.name, vendorCompanyName: v.companyName, email: v.email, phone: v.phone }));

    return linkedVendors.filter(
      (vendor, index, array) => array.findIndex((item) => item.vendorId === vendor.vendorId) === index,
    );
  }

  private toDto(invite: {
    id: string;
    token: string;
    usedByVendorId: string | null;
    expiresAt: Date | null;
    createdAt: Date;
  }): InviteDto {
    return {
      id: invite.id,
      token: invite.token,
      inviteUrl: `${FRONTEND_URL}/join?token=${invite.token}`,
      usedByVendorId: invite.usedByVendorId,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    };
  }
}
