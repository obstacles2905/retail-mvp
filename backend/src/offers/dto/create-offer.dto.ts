import { IsNotEmpty, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

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

  @IsNumberString()
  currentPrice!: string;

  @IsNumberString()
  volume!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  deliveryTerms?: string;
}

