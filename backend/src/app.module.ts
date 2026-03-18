import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { InvitesModule } from './invites/invites.module';
import { SkuModule } from './sku/sku.module';
import { OffersModule } from './offers/offers.module';
import { BuyerOrdersModule } from './buyer-orders/buyer-orders.module';

@Module({
  imports: [AuthModule, InvitesModule, SkuModule, OffersModule, BuyerOrdersModule],
})
export class AppModule {}

