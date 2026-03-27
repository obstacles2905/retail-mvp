import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SetAvatarDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  fileKey!: string;
}
