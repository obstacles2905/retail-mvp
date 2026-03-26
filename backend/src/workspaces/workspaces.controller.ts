import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get('my/team')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUYER')
  getMyTeam(@CurrentUser() user: { sub: string }) {
    return this.workspacesService.getMyTeam(user.sub);
  }

  @Get('invite-info/:token')
  getInviteInfo(@Param('token') token: string): Promise<{ workspaceName: string }> {
    return this.workspacesService.getInviteInfo(token);
  }
}
