import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SetAvatarDto } from './dto/set-avatar.dto';
import {
  UserSafe,
  UsersService,
} from './users.service';

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

  @Patch('me/avatar')
  setAvatar(
    @CurrentUser() user: { sub: string },
    @Body() dto: SetAvatarDto,
  ): Promise<UserSafe> {
    return this.usersService.setAvatarFromS3Key(user.sub, dto.fileKey);
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
