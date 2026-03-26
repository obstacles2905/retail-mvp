import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';
import { Request } from 'express';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID ?? 'dummy_client_id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? 'dummy_client_secret',
      callbackURL: process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:3001/api/auth/google/callback',
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(req: Request, _accessToken: string, _refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    const { name, emails, id } = profile;
    const email = emails[0].value;
    const firstName = name?.givenName || 'User';
    const lastName = name?.familyName || '';
    const fullName = `${firstName} ${lastName}`.trim();

    const stateObj = this.extractState(req.query.state);

    try {
      const user = await this.authService.validateGoogleUser({
        email,
        googleId: id,
        name: fullName,
        role: stateObj.role,
        companyName: stateObj.companyName,
        inviteToken: stateObj.inviteToken,
        teamToken: stateObj.teamToken,
      });
      done(null, user);
    } catch (err) {
      done(err, false);
    }
  }

  private extractState(rawState: unknown): Record<string, string> {
    if (typeof rawState !== 'string' || rawState.length === 0) {
      return {};
    }

    const fromBase64 = this.parseStateValue(Buffer.from(rawState, 'base64').toString('utf-8'));
    if (fromBase64) {
      return fromBase64;
    }

    const fromPlain = this.parseStateValue(rawState);
    if (fromPlain) {
      return fromPlain;
    }

    return {};
  }

  private parseStateValue(value: string): Record<string, string> | null {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      const source = parsed as Record<string, unknown>;
      const result: Record<string, string> = {};

      if (typeof source.role === 'string') result.role = source.role;
      if (typeof source.companyName === 'string') result.companyName = source.companyName;
      if (typeof source.inviteToken === 'string') result.inviteToken = source.inviteToken;
      if (typeof source.teamToken === 'string') result.teamToken = source.teamToken;

      return result;
    } catch {
      return null;
    }
  }
}
