import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { OfferItemInputDto } from './offer-item-input.dto';
import { V } from '../../common/validation-limits';

export class CreateOfferDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(V.UUID_MAX)
  buyerId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OfferItemInputDto)
  items!: OfferItemInputDto[];

  @IsOptional()
  @IsString()
  @MaxLength(V.DELIVERY_TERMS_MAX)
  deliveryTerms?: string;

  @IsISO8601()
  @IsNotEmpty()
  deliveryDate!: string;
}
