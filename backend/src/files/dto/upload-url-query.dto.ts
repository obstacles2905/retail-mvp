import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { V } from '../../common/validation-limits';

export const UPLOAD_ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
] as const;

export class UploadUrlQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(V.FILE_NAME_MAX)
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn([...UPLOAD_ALLOWED_MIME])
  fileType!: string;
}
