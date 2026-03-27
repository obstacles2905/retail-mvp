import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { V } from '../../common/validation-limits';

export class RejectOfferDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(V.REJECT_REASON_MAX)
  reason!: string;
}

