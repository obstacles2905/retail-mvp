import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { InvitesModule } from './invites/invites.module';
import { SkuModule } from './sku/sku.module';
import { OffersModule } from './offers/offers.module';
import { BuyerOrdersModule } from './buyer-orders/buyer-orders.module';
import { ChatsModule } from './chats/chats.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { CategoriesModule } from './categories/categories.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [AuthModule, InvitesModule, SkuModule, OffersModule, BuyerOrdersModule, ChatsModule, NotificationsModule, WorkspacesModule, CategoriesModule, AnalyticsModule, FilesModule],
})
export class AppModule {}

