import { Body, Controller, Get, Post, Put, Patch, Param, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SkuService, SkuDto } from './sku.service';
import { CreateSkuDto } from './dto/create-sku.dto';
import { UpdateSkuDto } from './dto/update-sku.dto';

@Controller('skus')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SkuController {
  constructor(private readonly skuService: SkuService) {}

  @Get()
  @Roles('BUYER', 'VENDOR')
  getAll(@CurrentUser() user: { sub: string; role: 'BUYER' | 'VENDOR'; workspaceId: string | null }): Promise<SkuDto[]> {
    return this.skuService.findAll(user.sub, user.role, user.workspaceId);
  }

  @Get('search')
  @Roles('BUYER', 'VENDOR')
  search(
    @Query('q') q: string,
    @Query('buyerId') buyerId: string,
    @CurrentUser() user: { sub: string; role: 'BUYER' | 'VENDOR' }
  ): Promise<SkuDto[]> {
    return this.skuService.search(q || '', buyerId, user.sub, user.role);
  }

  @Post()
  @Roles('BUYER')
  create(@Body() dto: CreateSkuDto, @CurrentUser() user: { sub: string; workspaceId: string | null }): Promise<SkuDto> {
    return this.skuService.create(dto, user.sub, user.workspaceId);
  }

  @Post('import')
  @Roles('BUYER')
  @UseInterceptors(FileInterceptor('file'))
  async importSkus(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { sub: string; workspaceId: string | null }
  ) {
    if (!file) {
      throw new BadRequestException('Файл не знайдено');
    }
    return this.skuService.importSkus(file.buffer, user.sub, user.workspaceId);
  }

  @Put(':id')
  @Roles('BUYER')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSkuDto,
    @CurrentUser() user: { sub: string }
  ): Promise<SkuDto> {
    return this.skuService.update(id, dto, user.sub);
  }

  @Patch(':id/archive')
  @Roles('BUYER')
  archive(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string }
  ): Promise<SkuDto> {
    return this.skuService.archive(id, user.sub);
  }
}

