import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InvitesService, InviteDto, LinkedBuyerDto, LinkedVendorDto } from './invites.service';

@Controller('invites')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post()
  @Roles('BUYER')
  create(@CurrentUser() user: { sub: string }): Promise<InviteDto> {
    return this.invitesService.create(user.sub);
  }

  @Get()
  @Roles('BUYER')
  list(@CurrentUser() user: { sub: string }): Promise<InviteDto[]> {
    return this.invitesService.findAllByBuyer(user.sub);
  }

  /** Для поставщика: закупщики, к которым он подключён по приглашению. */
  @Get('connections')
  @Roles('VENDOR')
  connections(@CurrentUser() user: { sub: string }): Promise<LinkedBuyerDto[]> {
    return this.invitesService.findConnectionsForVendor(user.sub);
  }

  /** Для закупщика: поставщики, которые подключились по его приглашениям. */
  @Get('vendor-connections')
  @Roles('BUYER')
  vendorConnections(@CurrentUser() user: { sub: string }): Promise<LinkedVendorDto[]> {
    return this.invitesService.findConnectionsForBuyer(user.sub);
  }
}
