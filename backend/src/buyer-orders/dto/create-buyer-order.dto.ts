import { ArrayMaxSize, ArrayMinSize, IsArray, IsNotEmpty, IsNumberString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateBuyerOrderDto {
  /** Товар из каталога закупщика. Либо skuId, либо productName. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  skuId?: string;

  /** Название товара (если нет skuId). */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  productName?: string;

  /** Категория товара (если нет skuId). */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category?: string;

  @IsNumberString()
  targetPrice!: string;

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

  /** Список поставщиков из контактов, кому разослать заказ. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  vendorIds!: string[];
}

