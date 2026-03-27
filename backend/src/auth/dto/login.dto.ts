import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { V } from '../../common/validation-limits';

export class LoginDto {
  @IsEmail()
  @MaxLength(V.EMAIL_MAX)
  email!: string;

  @IsString()
  @MinLength(V.PASSWORD_MIN)
  @MaxLength(V.PASSWORD_MAX)
  password!: string;
}

