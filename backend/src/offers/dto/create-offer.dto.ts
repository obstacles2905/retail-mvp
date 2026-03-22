import { IsNotEmpty, IsNumberString, IsOptional, IsString, MaxLength, IsISO8601 } from 'class-validator';

export class CreateOfferDto {
  /** Существующий SKU закупщика — либо он, либо buyerId+productName. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  skuId?: string;

  /** Закупщик (кому оффер) — обязателен при оффере «свой товар» (без skuId). */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  buyerId?: string;

  /** Название товара при оффере «свой товар» (без skuId). */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  productName?: string;

  /** Категория товара при оффере «свой товар» (без skuId). */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category?: string;

  @IsNumberString()
  currentPrice!: string;

  @IsNumberString()
  volume!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  deliveryTerms?: string;

  @IsISO8601()
  @IsNotEmpty()
  deliveryDate!: string;
}

