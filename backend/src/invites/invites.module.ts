import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvitesService } from './invites.service';
import { InvitesController } from './invites.controller';
import { InvitesPublicController } from './invites-public.controller';

@Module({
  controllers: [InvitesController, InvitesPublicController],
  providers: [InvitesService, PrismaService],
  exports: [InvitesService],
})
export class InvitesModule {}
