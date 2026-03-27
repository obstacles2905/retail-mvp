import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService, UserSafe } from '../users/users.service';
import { InvitesService } from '../invites/invites.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

export interface AuthPayload {
  sub: string;
  role: string;
  email: string;
  workspaceId: string | null;
}

export interface AuthResult {
  accessToken: string;
  user: UserSafe;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly invitesService: InvitesService,
    private readonly prisma: PrismaService,
  ) {}

  async register(dto: CreateUserDto): Promise<AuthResult> {
    if (dto.inviteToken != null && dto.role !== 'VENDOR') {
      throw new BadRequestException('Invite token is only valid for vendor registration');
    }

    const user = await this.usersService.createUser(dto);

    if (dto.inviteToken != null && dto.role === 'VENDOR') {
      await this.invitesService.markAsUsed(dto.inviteToken, user.id);
    }

    const payload = this.buildPayload(user);
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken, user };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const userWithHash = await this.usersService.findByEmail(dto.email);

    if (!userWithHash || !userWithHash.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordIsValid = await bcrypt.compare(dto.password, userWithHash.passwordHash);

    if (!passwordIsValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { passwordHash: _, ...safeUser } = userWithHash;
    const payload = this.buildPayload(safeUser);
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken, user: safeUser };
  }

  async validateGoogleUser(profile: {
    email: string;
    googleId: string;
    name: string;
    role?: string;
    companyName?: string;
    inviteToken?: string;
    teamToken?: string;
  }): Promise<UserSafe> {
    let user = await this.usersService.findByEmail(profile.email);

    if (user) {
      if (!user.googleId) {
        await this.usersService.updateGoogleId(user.id, profile.googleId);
      }
      if (profile.inviteToken && user.role === 'VENDOR') {
        try {
          await this.invitesService.markAsUsed(profile.inviteToken, user.id);
        } catch (e) {}
      }
      const { passwordHash: _, ...safeUser } = user;
      return safeUser;
    }

    const role: UserRole = profile.role === 'VENDOR' ? UserRole.VENDOR : UserRole.BUYER;
    const companyName = profile.companyName || profile.name;

    const newUser = await this.usersService.createGoogleUser({
      email: profile.email,
      googleId: profile.googleId,
      name: profile.name,
      companyName,
      role,
      teamToken: profile.teamToken,
    });

    if (profile.inviteToken && role === 'VENDOR') {
      try {
        await this.invitesService.markAsUsed(profile.inviteToken, newUser.id);
      } catch (e) {}
    }

    return newUser;
  }

  async googleLogin(user: UserSafe): Promise<AuthResult> {
    const payload = this.buildPayload(user);
    const accessToken = await this.jwtService.signAsync(payload);
    return { accessToken, user };
  }

  async createDemoAccount(): Promise<AuthResult> {
    const demoId = crypto.randomUUID().split('-')[0];
    const email = `demo-${demoId}@teno.app`;
    const passwordHash = await bcrypt.hash('demo-password', 10);

    const workspace = await this.prisma.workspace.create({
      data: { name: 'ТОВ "Варус" (Демо)' },
    });

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: 'Олександр (Головний закупник)',
        companyName: 'ТОВ "Варус"',
        role: UserRole.BUYER,
        isDemo: true,
        workspaceId: workspace.id,
      },
    });

    // Team members
    await this.prisma.user.createMany({
      data: [
        { email: `olena-${demoId}@teno.app`, name: 'Олена (Менеджер Фреш)', companyName: 'ТОВ "Варус"', role: UserRole.BUYER, isDemo: true, workspaceId: workspace.id },
        { email: `dmytro-${demoId}@teno.app`, name: 'Дмитро (Менеджер Напої)', companyName: 'ТОВ "Варус"', role: UserRole.BUYER, isDemo: true, workspaceId: workspace.id },
      ]
    });

    // Vendors
    const vendorsData = [
      { email: `vendor-dairy-${demoId}@test.com`, name: 'ТОВ "Галичина-Плюс"', companyName: 'ТОВ "Галичина-Плюс"', role: UserRole.VENDOR, isDemo: true },
      { email: `vendor-meat-${demoId}@test.com`, name: 'ТОВ "Глобино-Трейд"', companyName: 'ТОВ "Глобино-Трейд"', role: UserRole.VENDOR, isDemo: true },
      { email: `vendor-grocery-${demoId}@test.com`, name: 'ТОВ "Бакалія-Опт"', companyName: 'ТОВ "Бакалія-Опт"', role: UserRole.VENDOR, isDemo: true },
      { email: `vendor-drinks-${demoId}@test.com`, name: 'ТОВ "Оболонь-Дистриб\'юшн"', companyName: 'ТОВ "Оболонь-Дистриб\'юшн"', role: UserRole.VENDOR, isDemo: true },
      { email: `vendor-veg-${demoId}@test.com`, name: 'ФГ "Агро-Світ"', companyName: 'ФГ "Агро-Світ"', role: UserRole.VENDOR, isDemo: true },
    ];
    await this.prisma.user.createMany({ data: vendorsData });
    const vendors = await this.prisma.user.findMany({ where: { email: { in: vendorsData.map(v => v.email) } } });
    const vDairy = vendors.find(v => v.email.includes('dairy'))!;
    const vMeat = vendors.find(v => v.email.includes('meat'))!;
    const vGrocery = vendors.find(v => v.email.includes('grocery'))!;
    const vDrinks = vendors.find(v => v.email.includes('drinks'))!;
    const vVeg = vendors.find(v => v.email.includes('veg'))!;

    // Connect vendors to buyer via Invites
    const invitesData = vendors.map(v => ({
      token: crypto.randomUUID(),
      buyerId: user.id,
      usedByVendorId: v.id,
      workspaceId: workspace.id,
    }));
    await this.prisma.invite.createMany({ data: invitesData });

    // Categories
    const categories = [
      { name: 'Молочна продукція', normalizedName: 'molochna-produkciya', workspaceId: workspace.id },
      { name: 'М\'ясо та ковбасні вироби', normalizedName: 'myaso-kovbasni', workspaceId: workspace.id },
      { name: 'Бакалія', normalizedName: 'bakaliya', workspaceId: workspace.id },
      { name: 'Напої', normalizedName: 'napoyi', workspaceId: workspace.id },
      { name: 'Овочі та фрукти', normalizedName: 'ovochi-frukty', workspaceId: workspace.id },
    ];
    await this.prisma.category.createMany({ data: categories });
    const cats = await this.prisma.category.findMany({ where: { workspaceId: workspace.id } });
    const cDairy = cats.find(c => c.normalizedName === 'molochna-produkciya')!;
    const cMeat = cats.find(c => c.normalizedName === 'myaso-kovbasni')!;
    const cGrocery = cats.find(c => c.normalizedName === 'bakaliya')!;
    const cDrinks = cats.find(c => c.normalizedName === 'napoyi')!;
    const cVeg = cats.find(c => c.normalizedName === 'ovochi-frukty')!;

    // SKUs
    const skusData = [
      { name: 'Молоко 2.5% плівка 900г', uom: 'шт', targetPrice: 35.00, categoryId: cDairy.id, workspaceId: workspace.id, createdById: user.id },
      { name: 'Масло солодковершкове 73% 200г', uom: 'шт', targetPrice: 65.00, categoryId: cDairy.id, workspaceId: workspace.id, createdById: user.id },
      { name: 'Ковбаса варена "Лікарська" 1кг', uom: 'кг', targetPrice: 180.00, categoryId: cMeat.id, workspaceId: workspace.id, createdById: user.id },
      { name: 'Сосиски "Баварські" 1кг', uom: 'кг', targetPrice: 150.00, categoryId: cMeat.id, workspaceId: workspace.id, createdById: user.id },
      { name: 'Цукор-пісок 1кг', uom: 'кг', targetPrice: 28.00, categoryId: cGrocery.id, workspaceId: workspace.id, createdById: user.id },
      { name: 'Борошно пшеничне вищий сорт 2кг', uom: 'шт', targetPrice: 45.00, categoryId: cGrocery.id, workspaceId: workspace.id, createdById: user.id },
      { name: 'Вода мінеральна "Моршинська" с/г 1.5л', uom: 'шт', targetPrice: 18.00, categoryId: cDrinks.id, workspaceId: workspace.id, createdById: user.id },
      { name: 'Картопля мита 1кг', uom: 'кг', targetPrice: 22.00, categoryId: cVeg.id, workspaceId: workspace.id, createdById: user.id },
    ];
    for (const s of skusData) {
      await this.prisma.sku.create({ data: s });
    }
    const skus = await this.prisma.sku.findMany({ where: { workspaceId: workspace.id } });
    const sMilk = skus.find(s => s.name.includes('Молоко'))!;
    const sButter = skus.find(s => s.name.includes('Масло'))!;
    const sSausage = skus.find(s => s.name.includes('Ковбаса'))!;
    const sSugar = skus.find(s => s.name.includes('Цукор'))!;
    const sWater = skus.find(s => s.name.includes('Вода'))!;
    const sPotato = skus.find(s => s.name.includes('Картопля'))!;

    // OFFERS
    // 1. DELIVERED (Grocery - Цукор)
    const o1 = await this.prisma.offer.create({ data: { buyerId: user.id, vendorId: vGrocery.id, initiatorRole: 'BUYER', status: 'DELIVERED', currentTurn: 'BUYER', workspaceId: workspace.id, acceptedAt: new Date(Date.now() - 86400000 * 5) } });
    await this.prisma.offerItem.create({ data: { offerId: o1.id, skuId: sSugar.id, productName: sSugar.name, category: cGrocery.name, currentPrice: 26.50, initialPrice: 28.00, finalPrice: 26.50, savedAmount: 7500, volume: 5000, unit: 'кг' } });

    // 2. DELIVERED (Drinks - Вода)
    const o2 = await this.prisma.offer.create({ data: { buyerId: user.id, vendorId: vDrinks.id, initiatorRole: 'BUYER', status: 'DELIVERED', currentTurn: 'BUYER', workspaceId: workspace.id, acceptedAt: new Date(Date.now() - 86400000 * 2) } });
    await this.prisma.offerItem.create({ data: { offerId: o2.id, skuId: sWater.id, productName: sWater.name, category: cDrinks.name, currentPrice: 16.80, initialPrice: 18.00, finalPrice: 16.80, savedAmount: 2400, volume: 2000, unit: 'шт' } });

    // 3. AWAITING_DELIVERY (Dairy - Масло)
    const o3 = await this.prisma.offer.create({ data: { buyerId: user.id, vendorId: vDairy.id, initiatorRole: 'BUYER', status: 'AWAITING_DELIVERY', currentTurn: 'BUYER', workspaceId: workspace.id, acceptedAt: new Date(), deliveryDate: new Date(Date.now() + 86400000 * 2) } });
    await this.prisma.offerItem.create({ data: { offerId: o3.id, skuId: sButter.id, productName: sButter.name, category: cDairy.name, currentPrice: 62.00, initialPrice: 65.00, finalPrice: 62.00, savedAmount: 3000, volume: 1000, unit: 'шт' } });

    // 4. COUNTER_OFFER (Meat - Ковбаса)
    const o4 = await this.prisma.offer.create({ data: { buyerId: user.id, vendorId: vMeat.id, initiatorRole: 'BUYER', status: 'COUNTER_OFFER', currentTurn: 'BUYER', workspaceId: workspace.id } });
    await this.prisma.offerItem.create({ data: { offerId: o4.id, skuId: sSausage.id, productName: sSausage.name, category: cMeat.name, currentPrice: 175.00, initialPrice: 180.00, volume: 500, unit: 'кг' } });
    await this.prisma.offerHistory.create({ data: { offerId: o4.id, previousPrice: 180.00, newPrice: 175.00, createdById: vMeat.id, comment: 'Можемо запропонувати таку ціну за обсяг 500кг' } });

    // 5. NEW (Veg - Картопля)
    const o5 = await this.prisma.offer.create({ data: { buyerId: user.id, vendorId: vVeg.id, initiatorRole: 'BUYER', status: 'NEW', currentTurn: 'VENDOR', workspaceId: workspace.id } });
    await this.prisma.offerItem.create({ data: { offerId: o5.id, skuId: sPotato.id, productName: sPotato.name, category: cVeg.name, currentPrice: 22.00, initialPrice: 22.00, volume: 2000, unit: 'кг' } });

    // 6. REJECTED (Dairy - Молоко)
    const o6 = await this.prisma.offer.create({ data: { buyerId: user.id, vendorId: vDairy.id, initiatorRole: 'BUYER', status: 'REJECTED', currentTurn: 'BUYER', workspaceId: workspace.id } });
    await this.prisma.offerItem.create({ data: { offerId: o6.id, skuId: sMilk.id, productName: sMilk.name, category: cDairy.name, currentPrice: 38.00, initialPrice: 35.00, volume: 1000, unit: 'шт' } });
    await this.prisma.offerHistory.create({ data: { offerId: o6.id, previousPrice: 35.00, newPrice: 38.00, createdById: vDairy.id, comment: 'На жаль, ціна на молоко зросла' } });

    const safeUser: UserSafe = {
      id: user.id,
      email: user.email,
      name: user.name,
      companyName: user.companyName,
      workspaceId: user.workspaceId,
      phone: user.phone,
      avatarPath: user.avatarPath,
      role: user.role,
      isDemo: user.isDemo,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const payload = this.buildPayload(safeUser);
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken, user: safeUser };
  }

  async deleteDemoAccount(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isDemo) {
      throw new BadRequestException('Not a demo user');
    }

    if (user.workspaceId) {
      await this.prisma.offerMessage.deleteMany({ where: { offer: { workspaceId: user.workspaceId } } });
      await this.prisma.offerHistory.deleteMany({ where: { offer: { workspaceId: user.workspaceId } } });
      await this.prisma.offerReadState.deleteMany({ where: { offer: { workspaceId: user.workspaceId } } });
      await this.prisma.offerItem.deleteMany({ where: { offer: { workspaceId: user.workspaceId } } });
      await this.prisma.offer.deleteMany({ where: { workspaceId: user.workspaceId } });
      await this.prisma.sku.deleteMany({ where: { workspaceId: user.workspaceId } });
      await this.prisma.category.deleteMany({ where: { workspaceId: user.workspaceId } });
      await this.prisma.invite.deleteMany({ where: { workspaceId: user.workspaceId } });
      
      const demoPrefix = user.email.split('@')[0].replace('demo-', '');
      await this.prisma.user.deleteMany({
        where: {
          isDemo: true,
          role: 'VENDOR',
          email: { contains: demoPrefix }
        }
      });

      await this.prisma.user.deleteMany({ where: { workspaceId: user.workspaceId } });
      await this.prisma.workspace.delete({ where: { id: user.workspaceId } });
    } else {
      await this.prisma.user.delete({ where: { id: userId } });
    }
  }

  private buildPayload(user: UserSafe): AuthPayload {
    return {
      sub: user.id,
      role: user.role,
      email: user.email,
      workspaceId: user.workspaceId,
    };
  }
}

