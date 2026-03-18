import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

export interface UserSafe {
  id: string;
  email: string;
  name: string;
  companyName: string;
  avatarPath: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  private static readonly SALT_ROUNDS = 10;

  constructor(private readonly prisma: PrismaService) {}

  async createUser(dto: CreateUserDto): Promise<UserSafe> {
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

  async findByEmail(email: string): Promise<null | (UserSafe & { passwordHash: string })> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const { passwordHash, ...rest } = user;
    return {
      ...rest,
      passwordHash,
    };
  }

  async findSafeById(userId: string): Promise<UserSafe | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    return this.toUserSafe(user);
  }

  async updateMe(userId: string, dto: { name?: string; companyName?: string }): Promise<UserSafe> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name ?? undefined,
        companyName: dto.companyName ?? undefined,
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

  private toUserSafe(user: {
    id: string;
    email: string;
    name: string;
    companyName: string;
    avatarPath?: string | null;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }): UserSafe {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      companyName: user.companyName,
      avatarPath: user.avatarPath ?? null,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

