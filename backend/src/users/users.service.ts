import { Injectable, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

export interface UserSafe {
  id: string;
  email: string;
  name: string;
  companyName: string;
  workspaceId: string | null;
  phone: string | null;
  avatarPath: string | null;
  role: string;
  isDemo?: boolean;
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

    const buyerWorkspaceId =
      dto.role === UserRole.BUYER
        ? await this.resolveBuyerWorkspaceId(dto.companyName, dto.teamToken)
        : null;

    const user = dto.role === UserRole.BUYER
      ? await this.prisma.$transaction(async (tx) => {
          return tx.user.create({
            data: {
              email: dto.email,
              passwordHash,
              name: dto.name,
              companyName: dto.companyName,
              role: dto.role,
              workspaceId: buyerWorkspaceId,
            },
          });
        })
      : await this.prisma.user.create({
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

  /** Після успішного PUT на presigned URL — зберегти S3 object key у профілі. */
  async setAvatarFromS3Key(userId: string, fileKey: string): Promise<UserSafe> {
    const prefix = `avatars/${userId}/`;
    if (!fileKey.startsWith(prefix) || fileKey.includes('..')) {
      throw new BadRequestException('Invalid avatar file key');
    }
    return this.setAvatarPath(userId, fileKey);
  }

  async updateGoogleId(userId: string, googleId: string): Promise<UserSafe> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { googleId },
    });
    return this.toUserSafe(user);
  }

  async createGoogleUser(data: {
    email: string;
    googleId: string;
    name: string;
    companyName: string;
    role: UserRole;
    teamToken?: string;
  }): Promise<UserSafe> {
    const buyerWorkspaceId =
      data.role === UserRole.BUYER
        ? await this.resolveBuyerWorkspaceId(data.companyName, data.teamToken)
        : null;

    const user = data.role === UserRole.BUYER
      ? await this.prisma.user.create({
          data: {
            email: data.email,
            googleId: data.googleId,
            name: data.name,
            companyName: data.companyName,
            role: data.role,
            workspaceId: buyerWorkspaceId,
          },
        })
      : await this.prisma.user.create({
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

  private async resolveBuyerWorkspaceId(companyName: string, teamToken?: string): Promise<string> {
    if (!teamToken) {
      const workspace = await this.prisma.workspace.create({
        data: { name: companyName },
      });
      return workspace.id;
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { teamInviteToken: teamToken },
      select: { id: true },
    });

    if (!workspace) {
      throw new BadRequestException('Invalid team invite token');
    }

    return workspace.id;
  }

  private toUserSafe(user: {
    id: string;
    email: string;
    name: string;
    companyName: string;
    workspaceId?: string | null;
    phone?: string | null;
    avatarPath?: string | null;
    googleId?: string | null;
    role: string;
    isDemo?: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): UserSafe {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      companyName: user.companyName,
      workspaceId: user.workspaceId ?? null,
      phone: user.phone ?? null,
      avatarPath: user.avatarPath ?? null,
      googleId: user.googleId ?? null,
      role: user.role,
      isDemo: user.isDemo ?? false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

