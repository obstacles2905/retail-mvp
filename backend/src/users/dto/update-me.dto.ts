import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { V } from '../../common/validation-limits';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(V.NAME_MAX)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(V.COMPANY_NAME_MAX)
  companyName?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === '' ? null : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(V.PHONE_MAX)
  phone?: string | null;
}

