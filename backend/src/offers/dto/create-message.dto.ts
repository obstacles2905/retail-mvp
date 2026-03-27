import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { V } from '../../common/validation-limits';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(V.OFFER_MESSAGE_MAX)
  content!: string;
}
