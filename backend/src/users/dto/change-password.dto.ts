import { IsString, MaxLength, MinLength } from 'class-validator';
import { Match } from '../../common/validators/match.decorator';
import { V } from '../../common/validation-limits';

export class ChangePasswordDto {
  @IsString()
  @MinLength(V.PASSWORD_MIN)
  @MaxLength(V.PASSWORD_MAX)
  currentPassword!: string;

  @IsString()
  @MinLength(V.PASSWORD_MIN)
  @MaxLength(V.PASSWORD_MAX)
  newPassword!: string;

  @IsString()
  @MinLength(V.PASSWORD_MIN)
  @MaxLength(V.PASSWORD_MAX)
  @Match<ChangePasswordDto>('newPassword', {
    message: 'Password confirmation does not match password',
  })
  confirmNewPassword!: string;
}

