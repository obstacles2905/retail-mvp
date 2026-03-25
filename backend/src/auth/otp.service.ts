import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OtpService {
  // 5 minutes TTL per requirements
  private static readonly OTP_TTL_MS = 10 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  async requestOtp(rawPhone: string): Promise<{ expiresAt: Date }> {
    const phone = this.normalizePhone(rawPhone);
    const code = this.generateCode6();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OtpService.OTP_TTL_MS);

    // Invalidate/overwrite any active code for this phone
    await this.prisma.otpVerification.deleteMany({
      where: {
        phone,
        expiresAt: { gt: now },
      },
    });

    const createdOtp = await this.prisma.otpVerification.create({
      data: {
        phone,
        code,
        expiresAt,
      },
    });

    try {
      return { expiresAt };
    } catch (err) {
      // Keep DB consistent: if SMS delivery failed, remove the code as it cannot be used.
      await this.prisma.otpVerification.delete({ where: { id: createdOtp.id } }).catch(() => {});
      throw err;
    }
  }

  /**
   * Checks that the code matches and is not expired. Does NOT delete the row —
   * so AuthService can return 400 (need profile) without invalidating the code.
   */
  async validateOtp(rawPhone: string, code: string): Promise<{ id: string }> {
    const phone = this.normalizePhone(rawPhone);
    const now = new Date();

    const otp = await this.prisma.otpVerification.findFirst({
      where: {
        phone,
        code,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new UnauthorizedException('Невірний або прострочений код підтвердження');
    }

    return { id: otp.id };
  }

  /** Call after successful login / registration so the code cannot be reused. */
  async consumeOtp(otpId: string): Promise<void> {
    await this.prisma.otpVerification.delete({ where: { id: otpId } });
  }

  private generateCode6(): string {
    const num = randomInt(0, 1_000_000);
    return num.toString().padStart(6, '0');
  }

  private normalizePhone(rawPhone: string): string {
    const cleaned = rawPhone.trim().replace(/[\s()-]/g, '');
    const digits = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
    const normalized = digits.replace(/\D/g, '');

    // UA format: +380XXXXXXXXX (12 digits)
    if (normalized.startsWith('380') && normalized.length === 12) return normalized;

    // Local leading 0 case: 0XXXXXXXXX (10 digits)
    if (normalized.startsWith('0') && normalized.length === 10) {
      return `380${normalized.slice(1)}`;
    }

    throw new BadRequestException('Некоректний номер телефону');
  }
}

