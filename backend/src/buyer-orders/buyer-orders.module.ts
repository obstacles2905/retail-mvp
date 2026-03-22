import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvitesModule } from '../invites/invites.module';
import { OffersModule } from '../offers/offers.module';
import { BuyerOrdersController } from './buyer-orders.controller';
import { BuyerOrdersService } from './buyer-orders.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [InvitesModule, OffersModule, NotificationsModule],
  controllers: [BuyerOrdersController],
  providers: [BuyerOrdersService, PrismaService],
})
export class BuyerOrdersModule {}

