import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { V } from '../../common/validation-limits';

export const AVATAR_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;

export class AvatarUploadUrlQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(V.FILE_NAME_MAX)
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn([...AVATAR_ALLOWED_MIME])
  fileType!: string;
}
