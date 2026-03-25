import { IsNotEmpty, IsString } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;
}

