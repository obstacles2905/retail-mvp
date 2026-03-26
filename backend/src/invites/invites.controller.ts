import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InvitesService, InviteDto, LinkedBuyerDto, LinkedVendorDto } from './invites.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';

@Controller('invites')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Get('mine')
  @Roles('BUYER')
  async getMyInvite(@CurrentUser() user: { sub: string }) {
    return this.invitesService.getMyInviteLink(user.sub);
  }

  @Post()
  @Roles('BUYER')
  create(@CurrentUser() user: { sub: string }): Promise<InviteDto> {
    return this.invitesService.create(user.sub);
  }

  @Post('accept')
  @Roles('VENDOR')
  async accept(@CurrentUser() user: { sub: string }, @Body() dto: AcceptInviteDto): Promise<{ ok: boolean }> {
    await this.invitesService.markAsUsed(dto.token, user.sub);
    return { ok: true };
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
  vendorConnections(@CurrentUser() user: { workspaceId: string | null }): Promise<LinkedVendorDto[]> {
    return this.invitesService.findConnectionsForBuyer(user.workspaceId);
  }
}
