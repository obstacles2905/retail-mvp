import { Module } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { ChatsController } from './chats.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ChatsRealtimeService } from '../realtime/chats-realtime.service';
import { ChatsGateway } from '../realtime/chats.gateway';
import { WsJwtGuard } from '../realtime/ws-jwt.guard';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [ChatsController],
  providers: [ChatsService, PrismaService, ChatsRealtimeService, ChatsGateway, WsJwtGuard],
  exports: [ChatsService],
})
export class ChatsModule {}
