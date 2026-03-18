import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectOfferDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;
}

