import { IsString, MinLength } from 'class-validator';
import { Match } from '../../common/validators/match.decorator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;

  @IsString()
  @MinLength(8)
  @Match<ChangePasswordDto>('newPassword', {
    message: 'Password confirmation does not match password',
  })
  confirmNewPassword!: string;
}

