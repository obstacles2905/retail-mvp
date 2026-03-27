import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { V } from '../../common/validation-limits';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(V.CHAT_MESSAGE_MAX)
  content!: string;
}
