import { IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';

export class CounterOfferDto {
  @IsNumberString()
  newPrice!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  comment?: string;
}

