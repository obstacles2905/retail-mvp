import { randomUUID } from 'crypto';
import { extname } from 'path';

import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { AVATAR_ALLOWED_MIME } from './dto/avatar-upload-url-query.dto';
import { UPLOAD_ALLOWED_MIME } from './dto/upload-url-query.dto';

const ALLOWED_SET = new Set<string>(UPLOAD_ALLOWED_MIME);
const AVATAR_MIME_SET = new Set<string>(AVATAR_ALLOWED_MIME);
const AVATAR_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function sanitizeFileName(raw: string): string {
  const trimmed = raw.trim();
  const base = trimmed.replace(/^.*[/\\]/, '');
  const safe = base
    .replace(/[^\w.\- ()\u0400-\u04FF]/gi, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
  return safe.length > 0 ? safe : 'file';
}

@Injectable()
export class FilesService {
  private readonly client: S3Client | null;
  private readonly bucket: string | undefined;

  constructor() {
    this.bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
    if (!this.bucket || !region) {
      this.client = null;
      return;
    }
    this.client = new S3Client({ region });
  }

  async getUploadUrl(
    fileName: string,
    fileType: string,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    if (!this.client || !this.bucket) {
      throw new ServiceUnavailableException(
        'File uploads are not configured (set AWS_S3_BUCKET and AWS_REGION)',
      );
    }

    const normalizedType = fileType.split(';')[0].trim().toLowerCase();
    if (!ALLOWED_SET.has(normalizedType)) {
      throw new BadRequestException('File type not allowed');
    }

    const safeName = sanitizeFileName(fileName);
    const fileKey = `uploads/${Date.now()}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: normalizedType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: 300 });
    return { uploadUrl, fileKey };
  }

  async getAvatarUploadUrl(
    userId: string,
    fileName: string,
    fileType: string,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    if (!this.client || !this.bucket) {
      throw new ServiceUnavailableException(
        'File uploads are not configured (set AWS_S3_BUCKET and AWS_REGION)',
      );
    }

    const normalizedType = fileType.split(';')[0].trim().toLowerCase();
    if (!AVATAR_MIME_SET.has(normalizedType)) {
      throw new BadRequestException('Only png, jpg, or webp images are allowed');
    }

    const safeName = sanitizeFileName(fileName);
    let ext = extname(safeName).toLowerCase();
    if (!AVATAR_EXT.has(ext)) {
      ext =
        normalizedType === 'image/png'
          ? '.png'
          : normalizedType === 'image/webp'
            ? '.webp'
            : '.jpg';
    }

    const fileKey = `avatars/${userId}/${randomUUID()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: normalizedType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: 300 });
    return { uploadUrl, fileKey };
  }

  async getDownloadUrl(fileKey: string): Promise<{ downloadUrl: string }> {
    if (!this.client || !this.bucket) {
      throw new ServiceUnavailableException(
        'File storage is not configured (set AWS_S3_BUCKET and AWS_REGION)',
      );
    }

    if (fileKey.includes('..')) {
      throw new BadRequestException('Invalid file key');
    }
    const okUploads = /^uploads\/[^/]+$/.test(fileKey);
    const okAvatars = /^avatars\/[^/]+\/[^/]+$/.test(fileKey);
    if (!okUploads && !okAvatars) {
      throw new BadRequestException('Invalid file key');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });

    const downloadUrl = await getSignedUrl(this.client, command, { expiresIn: 900 });
    return { downloadUrl };
  }
}
