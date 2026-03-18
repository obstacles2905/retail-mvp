import { Controller, Get, Param } from '@nestjs/common';
import { InvitesService } from './invites.service';

@Controller('invites')
export class InvitesPublicController {
  constructor(private readonly invitesService: InvitesService) {}

  /** Публичная проверка токена приглашения (для страницы /join). */
  @Get('validate/:token')
  async validate(@Param('token') token: string): Promise<{ valid: boolean; buyerCompanyName?: string }> {
    const result = await this.invitesService.validateToken(token);
    if (!result) {
      return { valid: false };
    }
    return { valid: true, buyerCompanyName: result.buyerCompanyName };
  }
}
