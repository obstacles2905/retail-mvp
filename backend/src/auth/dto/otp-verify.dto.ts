import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, Matches } from 'class-validator';
import { UserRole } from '@prisma/client';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Код має бути 6-значним' })
  code!: string;

  // Required only when the user with this phone doesn't exist yet.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  companyName?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

