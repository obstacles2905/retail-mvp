import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { diskStorage } from 'multer';
import {
  extname,
  join,
} from 'path';

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  UserSafe,
  UsersService,
} from './users.service';

function safeAvatarFilename(originalName: string): string {
  const ext = extname(originalName).toLowerCase();
  const allowed = new Set(['.png', '.jpg', '.jpeg', '.webp']);
  const finalExt = allowed.has(ext) ? ext : '.png';
  return `${randomUUID()}${finalExt}`;
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: { sub: string }): Promise<UserSafe | null> {
    return this.usersService.findSafeById(user.sub);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: { sub: string }, @Body() dto: UpdateMeDto): Promise<UserSafe> {
    return this.usersService.updateMe(user.sub, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) =>
          cb(null, join(process.cwd(), 'uploads', 'avatars')),
        filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) =>
          cb(null, safeAvatarFilename(file.originalname)),
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
        const ok = ['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype);
        cb(ok ? null : new BadRequestException('Only png/jpg/webp allowed'), ok);
      },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: { sub: string },
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<UserSafe> {
    if (!file) throw new BadRequestException('File is required');
    const publicPath = `/uploads/avatars/${file.filename}`;
    return this.usersService.setAvatarPath(user.sub, publicPath);
  }

  @Post('me/change-password')
  async changePassword(
    @CurrentUser() user: { sub: string },
    @Body() dto: ChangePasswordDto,
  ): Promise<{ ok: true }> {
    await this.usersService.changePassword(user.sub, dto.currentPassword, dto.newPassword);
    return { ok: true };
  }
}

