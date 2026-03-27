import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty, IsNumberString, IsString, MaxLength, ValidateNested } from 'class-validator';
import { V } from '../../common/validation-limits';

export class ProposeItemPriceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(V.UUID_MAX)
  itemId!: string;

  @IsNumberString()
  @MaxLength(V.PRICE_STRING_MAX)
  newPrice!: string;
}

export class ProposePriceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProposeItemPriceDto)
  items!: ProposeItemPriceDto[];
}
