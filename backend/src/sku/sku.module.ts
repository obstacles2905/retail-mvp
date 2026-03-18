import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvitesModule } from '../invites/invites.module';
import { SkuService } from './sku.service';
import { SkuController } from './sku.controller';

@Module({
  imports: [InvitesModule],
  controllers: [SkuController],
  providers: [SkuService, PrismaService],
  exports: [SkuService],
})
export class SkuModule {}

