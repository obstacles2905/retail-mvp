import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { OfferStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OffersService, OfferDetailDto, OfferDto, OfferListItemDto, OfferMessageDto } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CounterOfferDto } from './dto/counter-offer.dto';
import { ProposePriceDto } from './dto/propose-price.dto';
import { UpdateOfferStatusDto } from './dto/update-offer-status.dto';
import { RejectOfferDto } from './dto/reject-offer.dto';

@Controller('offers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post()
  @Roles('VENDOR')
  create(@Body() dto: CreateOfferDto, @CurrentUser() user: { sub: string }): Promise<OfferDto> {
    return this.offersService.create(dto, user.sub);
  }

  @Get()
  @Roles('BUYER', 'VENDOR')
  getAll(
    @CurrentUser() user: { sub: string; role: 'BUYER' | 'VENDOR' },
    @Query('status') status?: OfferStatus,
  ): Promise<OfferListItemDto[]> {
    return this.offersService.findAllForUser(user.sub, user.role, status);
  }

  @Get(':id')
  @Roles('BUYER', 'VENDOR')
  getOne(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; role: 'BUYER' | 'VENDOR' },
  ): Promise<OfferDetailDto> {
    return this.offersService.getOne(id, user.sub, user.role);
  }

  @Patch(':id/counter')
  @Roles('BUYER', 'VENDOR')
  counter(
    @Param('id') id: string,
    @Body() dto: CounterOfferDto,
    @CurrentUser() user: { sub: string; role: 'BUYER' | 'VENDOR' },
  ): Promise<OfferDto> {
    return this.offersService.counterOffer(id, user.sub, user.role, dto);
  }

  @Patch(':id/status')
  @Roles('BUYER', 'VENDOR')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOfferStatusDto,
    @CurrentUser() user: { sub: string; role: 'BUYER' | 'VENDOR' },
  ): Promise<OfferDto> {
    return this.offersService.updateStatus(id, user.sub, user.role, dto);
  }

  @Get(':id/messages')
  @Roles('BUYER', 'VENDOR')
  getMessages(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; role: 'BUYER' | 'VENDOR' },
  ): Promise<OfferMessageDto[]> {
    return this.offersService.getMessages(id, user.sub, user.role);
  }

  @Post(':id/reschedule')
  async rescheduleDelivery(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; role: 'BUYER' | 'VENDOR' },
    @Body('deliveryDate') deliveryDate: string,
  ) {
    return this.offersService.rescheduleDelivery(id, user.sub, user.role, new Date(deliveryDate));
  }

  @Post(':id/messages')
  @Roles('BUYER', 'VENDOR')
  sendMessage(
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: { sub: string; role: 'BUYER' | 'VENDOR' },
  ): Promise<OfferMessageDto> {
    return this.offersService.sendMessage(id, user.sub, user.role, dto);
  }

  @Post(':id/propose')
  @Roles('BUYER', 'VENDOR')
  proposePrice(
    @Param('id') id: string,
    @Body() dto: ProposePriceDto,
    @CurrentUser() user: { sub: string; role: 'BUYER' | 'VENDOR' },
  ): Promise<OfferDto> {
    return this.offersService.proposePrice(id, user.sub, user.role, dto);
  }

  @Post(':id/accept')
  @Roles('BUYER', 'VENDOR')
  acceptDeal(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; role: 'BUYER' | 'VENDOR' },
  ): Promise<OfferDto> {
    return this.offersService.acceptDeal(id, user.sub, user.role);
  }

  @Post(':id/reject')
  @Roles('BUYER', 'VENDOR')
  rejectDeal(
    @Param('id') id: string,
    @Body() dto: RejectOfferDto,
    @CurrentUser() user: { sub: string; role: 'BUYER' | 'VENDOR' },
  ): Promise<OfferDto> {
    return this.offersService.rejectDeal(id, user.sub, user.role, dto);
  }

  @Post(':id/read')
  @Roles('BUYER', 'VENDOR')
  async markRead(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; role: 'BUYER' | 'VENDOR' },
  ): Promise<{ ok: true }> {
    await this.offersService.markRead(id, user.sub, user.role);
    return { ok: true };
  }

  @Get('unread-counts')
  @Roles('BUYER', 'VENDOR')
  unreadCounts(
    @Query('ids') ids: string,
    @CurrentUser() user: { sub: string; role: 'BUYER' | 'VENDOR' },
  ): Promise<Record<string, number>> {
    const offerIds = typeof ids === 'string' && ids.trim() ? ids.split(',').map((x) => x.trim()) : [];
    return this.offersService.getUnreadCounts(offerIds, user.sub, user.role);
  }
}

