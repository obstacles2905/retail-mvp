import { IsNumberString } from 'class-validator';

export class ProposePriceDto {
  @IsNumberString()
  newPrice!: string;
}
