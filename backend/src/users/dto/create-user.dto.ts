import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';
import { Match } from '../../common/validators/match.decorator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(8)
  @Match<CreateUserDto>('password', {
    message: 'Password confirmation does not match password',
  })
  confirmPassword!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  /** Токен приглашения от закупщика — только для регистрации поставщика по ссылке. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  inviteToken?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  teamToken?: string;
}

