import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SkuService, SkuDto } from './sku.service';
import { CreateSkuDto } from './dto/create-sku.dto';

@Controller('skus')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SkuController {
  constructor(private readonly skuService: SkuService) {}

  @Get()
  @Roles('BUYER', 'VENDOR')
  getAll(@CurrentUser() user: { sub: string; role: 'BUYER' | 'VENDOR' }): Promise<SkuDto[]> {
    return this.skuService.findAll(user.sub, user.role);
  }

  @Post()
  @Roles('BUYER')
  create(@Body() dto: CreateSkuDto, @CurrentUser() user: { sub: string }): Promise<SkuDto> {
    return this.skuService.create(dto, user.sub);
  }
}

