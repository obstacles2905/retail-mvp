import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { V } from '../../common/validation-limits';

export class CreateSkuDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(V.PRODUCT_NAME_MAX)
  name!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(V.UUID_MAX)
  categoryId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(V.UNIT_MAX)
  uom!: string;

  @IsOptional()
  @IsString()
  @MaxLength(V.ARTICLE_CODE_MAX)
  articleCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(V.BARCODE_MAX)
  barcode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(V.PRICE_STRING_MAX)
  targetPrice?: string;
}

