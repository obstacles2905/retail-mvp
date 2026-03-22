import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { OfferItemInputDto } from './offer-item-input.dto';

export class CreateOfferDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  buyerId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OfferItemInputDto)
  items!: OfferItemInputDto[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  deliveryTerms?: string;

  @IsISO8601()
  @IsNotEmpty()
  deliveryDate!: string;
}
