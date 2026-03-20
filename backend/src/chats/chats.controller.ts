import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateChatDto } from './dto/create-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  listChats(@CurrentUser() user: { sub: string }) {
    return this.chatsService.listChats(user.sub);
  }

  @Post()
  createChat(@CurrentUser() user: { sub: string }, @Body() dto: CreateChatDto) {
    return this.chatsService.createOrGetChat(user.sub, dto.participantId);
  }

  @Get(':id')
  getChat(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.chatsService.getChatDetails(id, user.sub);
  }

  @Post(':id/messages')
  sendMessage(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatsService.sendMessage(id, user.sub, dto.content);
  }

  @Post(':id/read')
  async markAsRead(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    await this.chatsService.markAsRead(id, user.sub);
    return { ok: true };
  }
}
