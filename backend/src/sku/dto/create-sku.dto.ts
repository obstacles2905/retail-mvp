import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSkuDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsOptional()
  @IsString()
  targetPrice?: string;
}

