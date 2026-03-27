import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

import { AvatarUploadUrlQueryDto } from './dto/avatar-upload-url-query.dto';
import { DownloadUrlQueryDto } from './dto/download-url-query.dto';
import { UploadUrlQueryDto } from './dto/upload-url-query.dto';
import { FilesService } from './files.service';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('upload-url')
  getUploadUrl(
    @Query() query: UploadUrlQueryDto,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    return this.filesService.getUploadUrl(query.fileName, query.fileType);
  }

  @Get('avatar-upload-url')
  getAvatarUploadUrl(
    @CurrentUser() user: { sub: string },
    @Query() query: AvatarUploadUrlQueryDto,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    return this.filesService.getAvatarUploadUrl(user.sub, query.fileName, query.fileType);
  }

  @Get('download-url')
  getDownloadUrl(
    @Query() query: DownloadUrlQueryDto,
  ): Promise<{ downloadUrl: string }> {
    return this.filesService.getDownloadUrl(query.fileKey);
  }
}
