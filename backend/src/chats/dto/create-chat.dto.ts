import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { V } from '../../common/validation-limits';

export class CreateChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(V.UUID_MAX)
  participantId!: string;
}
