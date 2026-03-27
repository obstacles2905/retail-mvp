import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';
import { Match } from '../../common/validators/match.decorator';
import { V } from '../../common/validation-limits';

export class CreateUserDto {
  @IsEmail()
  @MaxLength(V.EMAIL_MAX)
  email!: string;

  @IsString()
  @MinLength(V.PASSWORD_MIN)
  @MaxLength(V.PASSWORD_MAX)
  password!: string;

  @IsString()
  @MinLength(V.PASSWORD_MIN)
  @MaxLength(V.PASSWORD_MAX)
  @Match<CreateUserDto>('password', {
    message: 'Password confirmation does not match password',
  })
  confirmPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(V.NAME_MAX)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(V.COMPANY_NAME_MAX)
  companyName!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(V.TOKEN_MAX)
  inviteToken?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(V.TOKEN_MAX)
  teamToken?: string;
}

