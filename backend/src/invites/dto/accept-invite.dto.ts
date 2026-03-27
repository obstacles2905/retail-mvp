import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { V } from '../../common/validation-limits';

export class AcceptInviteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(V.TOKEN_MAX)
  token!: string;
}
