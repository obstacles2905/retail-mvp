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

    let stateObj: any = {};
    if (req.query.state && typeof req.query.state === 'string') {
      try {
        stateObj = JSON.parse(Buffer.from(req.query.state, 'base64').toString('utf-8'));
      } catch (e) {
        // ignore
      }
    }

    try {
      const user = await this.authService.validateGoogleUser({
        email,
        googleId: id,
        name: fullName,
        role: stateObj.role,
        companyName: stateObj.companyName,
        inviteToken: stateObj.inviteToken,
      });
      done(null, user);
    } catch (err) {
      done(err, false);
    }
  }
}
