import { IsNotEmpty, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';
import { V } from '../../common/validation-limits';

export class OfferItemInputDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(V.UUID_MAX)
  skuId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(V.PRODUCT_NAME_MAX)
  productName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(V.CATEGORY_NAME_MAX)
  category?: string;

  @IsNumberString()
  @MaxLength(V.PRICE_STRING_MAX)
  currentPrice!: string;

  @IsNumberString()
  @MaxLength(V.VOLUME_STRING_MAX)
  volume!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(V.UNIT_MAX)
  unit?: string;
}
