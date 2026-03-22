import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { InvitesModule } from './invites/invites.module';
import { SkuModule } from './sku/sku.module';
import { OffersModule } from './offers/offers.module';
import { BuyerOrdersModule } from './buyer-orders/buyer-orders.module';
import { ChatsModule } from './chats/chats.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [AuthModule, InvitesModule, SkuModule, OffersModule, BuyerOrdersModule, ChatsModule, NotificationsModule],
})
export class AppModule {}

