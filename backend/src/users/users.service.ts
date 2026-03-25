import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export interface UserSafe {
  id: string;
  email: string;
  name: string;
  companyName: string;
  phone: string | null;
  avatarPath: string | null;
  role: string;
  googleId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  private static readonly SALT_ROUNDS = 10;

  constructor(private readonly prisma: PrismaService) {}

  async createUser(dto: CreateUserDto): Promise<UserSafe> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Користувач з таким email вже існує');
    }

    const passwordHash = await bcrypt.hash(dto.password, UsersService.SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        companyName: dto.companyName,
        role: dto.role,
      },
    });

    return this.toUserSafe(user);
  }

  async findByEmail(email: string): Promise<null | (UserSafe & { passwordHash: string | null })> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const { passwordHash } = user;
    return {
      ...this.toUserSafe(user),
      passwordHash,
    };
  }

  async findByPhone(phone: string): Promise<UserSafe | null> {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) return null;
    return this.toUserSafe(user);
  }

  async createUserByPhone(data: { phone: string; name: string; companyName: string; role: UserRole }): Promise<UserSafe> {
    // Email is mandatory in the current Prisma schema, so for phone-only accounts we generate a deterministic email
    // derived from the phone number. This ensures the account remains compatible with existing auth endpoints.
    const email = `${data.phone}@otp.retailprocure.local`;

    // If the email already exists (e.g., due to a rare collision), fail loudly to keep security expectations clear.
    const existingByEmail = await this.prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      throw new ConflictException('Користувач із таким номером телефону вже існує');
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        phone: data.phone,
        name: data.name,
        companyName: data.companyName,
        role: data.role,
      },
    });

    return this.toUserSafe(user);
  }

  async findSafeById(userId: string): Promise<UserSafe | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    return this.toUserSafe(user);
  }

  async updateMe(
    userId: string,
    dto: { name?: string; companyName?: string; phone?: string | null },
  ): Promise<UserSafe> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name ?? undefined,
        companyName: dto.companyName ?? undefined,
        phone: dto.phone ?? undefined,
      },
    });
    return this.toUserSafe(user);
  }

  async setAvatarPath(userId: string, avatarPath: string): Promise<UserSafe> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarPath },
    });
    return this.toUserSafe(user);
  }

  async updateGoogleId(userId: string, googleId: string): Promise<UserSafe> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { googleId },
    });
    return this.toUserSafe(user);
  }

  async createGoogleUser(data: { email: string; googleId: string; name: string; companyName: string; role: any }): Promise<UserSafe> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        googleId: data.googleId,
        name: data.name,
        companyName: data.companyName,
        role: data.role,
      },
    });
    return this.toUserSafe(user);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    if (!user.passwordHash) {
      throw new BadRequestException('User registered via Google. Cannot change password this way.');
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid current password');

    const passwordHash = await bcrypt.hash(newPassword, UsersService.SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  private toUserSafe(user: {
    id: string;
    email: string;
    name: string;
    companyName: string;
    phone?: string | null;
    avatarPath?: string | null;
    googleId?: string | null;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }): UserSafe {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      companyName: user.companyName,
      phone: user.phone ?? null,
      avatarPath: user.avatarPath ?? null,
      googleId: user.googleId ?? null,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

