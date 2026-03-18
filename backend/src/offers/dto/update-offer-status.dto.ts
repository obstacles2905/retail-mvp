import { IsEnum } from 'class-validator';
import { OfferStatus } from '@prisma/client';

export class UpdateOfferStatusDto {
  @IsEnum(OfferStatus)
  status!: OfferStatus;
}

