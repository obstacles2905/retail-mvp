import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSkuDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  categoryId?: string;

  @IsString()
  @IsNotEmpty()
  uom!: string;

  @IsOptional()
  @IsString()
  articleCode?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  targetPrice?: string;
}

