import { IsNotEmpty, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';
import { V } from '../../common/validation-limits';

export class CounterOfferDto {
  @IsNumberString()
  @MaxLength(V.PRICE_STRING_MAX)
  newPrice!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(V.COMMENT_MAX)
  comment?: string;
}

