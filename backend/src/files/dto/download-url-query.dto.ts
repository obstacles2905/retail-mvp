import { IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';

/** S3 object key: uploads/... or avatars/<userId>/... */
export class DownloadUrlQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  @Matches(/^(uploads\/[^/]+|avatars\/[^/]+\/[^/]+)$/, {
    message: 'Invalid file key',
  })
  fileKey!: string;
}
