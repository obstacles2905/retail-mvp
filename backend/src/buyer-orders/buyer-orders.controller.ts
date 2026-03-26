import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OfferDto, OfferListItemDto } from '../offers/offers.service';
import { BuyerOrdersService } from './buyer-orders.service';
import { CreateBuyerOrderDto } from './dto/create-buyer-order.dto';

@Controller('buyer/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BuyerOrdersController {
  constructor(private readonly buyerOrdersService: BuyerOrdersService) {}

  @Post()
  @Roles('BUYER')
  create(
    @CurrentUser() user: { sub: string; workspaceId: string | null },
    @Body() dto: CreateBuyerOrderDto,
  ): Promise<OfferDto[]> {
    return this.buyerOrdersService.createAndBroadcast(user.sub, user.workspaceId, dto);
  }

  @Get()
  @Roles('BUYER')
  list(@CurrentUser() user: { sub: string }): Promise<OfferListItemDto[]> {
    return this.buyerOrdersService.listBuyerOrders(user.sub);
  }
}

