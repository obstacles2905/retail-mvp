import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty, IsNumberString, IsString, ValidateNested } from 'class-validator';

export class ProposeItemPriceDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsNumberString()
  newPrice!: string;
}

export class ProposePriceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProposeItemPriceDto)
  items!: ProposeItemPriceDto[];
}
