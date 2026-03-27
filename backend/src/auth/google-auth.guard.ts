import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  handleRequest(err: any, user: any, _info: any, context: ExecutionContext) {
    if (err || !user) {
      const res = context.switchToHttp().getResponse<Response>();
      const frontendUrl = (process.env.FRONTEND_URL ?? 'https://retail-mvp.vercel.app').replace(/\/$/, '');
      res.redirect(`${frontendUrl}/register?error=google_no_account`);
      throw new UnauthorizedException();
    }
    return user;
  }
}
