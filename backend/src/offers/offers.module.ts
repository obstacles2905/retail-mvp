import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvitesModule } from '../invites/invites.module';
import { AuthModule } from '../auth/auth.module';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { OffersGateway } from '../realtime/offers.gateway';
import { WsJwtGuard } from '../realtime/ws-jwt.guard';
import { OffersRealtimeService } from '../realtime/offers-realtime.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [InvitesModule, AuthModule, NotificationsModule],
  controllers: [OffersController],
  providers: [OffersService, PrismaService, OffersRealtimeService, OffersGateway, WsJwtGuard],
  exports: [OffersService, OffersRealtimeService],
})
export class OffersModule {}

