import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { OfferItemInputDto } from '../../offers/dto/offer-item-input.dto';

export class CreateBuyerOrderDto {
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

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  vendorIds!: string[];
}
