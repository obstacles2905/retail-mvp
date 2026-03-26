import {
  IsNotEmpty,
  IsString,
} from 'class-validator';

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CategoriesService } from './categories.service';

class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Roles('BUYER', 'VENDOR')
  findAll(@CurrentUser() user: { workspaceId: string | null }) {
    return this.categoriesService.findAll(user.workspaceId);
  }

  @Post()
  @Roles('BUYER', 'VENDOR')
  create(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: { workspaceId: string | null },
  ) {
    return this.categoriesService.createOrGet(dto.name, user.workspaceId);
  }

  @Get(':id/skus')
  @Roles('BUYER')
  async getCategorySkus(
    @Param('id') id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @CurrentUser() user: { workspaceId: string | null },
  ) {
    return this.categoriesService.getSkus(id, user.workspaceId, parseInt(page, 10), parseInt(limit, 10));
  }

  @Patch(':id')
  @Roles('BUYER')
  update(
    @Param('id') id: string,
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: { workspaceId: string | null },
  ) {
    return this.categoriesService.update(id, dto.name, user.workspaceId);
  }

  @Delete(':id')
  @Roles('BUYER')
  delete(
    @Param('id') id: string,
    @CurrentUser() user: { workspaceId: string | null },
  ) {
    return this.categoriesService.delete(id, user.workspaceId);
  }
}
