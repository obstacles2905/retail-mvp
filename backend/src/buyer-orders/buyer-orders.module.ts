import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvitesModule } from '../invites/invites.module';
import { BuyerOrdersController } from './buyer-orders.controller';
import { BuyerOrdersService } from './buyer-orders.service';

@Module({
  imports: [InvitesModule],
  controllers: [BuyerOrdersController],
  providers: [BuyerOrdersService, PrismaService],
})
export class BuyerOrdersModule {}

