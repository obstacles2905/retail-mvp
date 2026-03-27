import { Body, Controller, Get, Post, Delete, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService, AuthResult } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GoogleAuthGuard } from './google-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthPayload } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: CreateUserDto): Promise<AuthResult> {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.authService.login(dto);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // Initiates the Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    const result = await this.authService.googleLogin(user);
    
    // Redirect to frontend with token
    const frontendUrl = (process.env.FRONTEND_URL ?? 'https://retail-mvp.vercel.app').replace(/\/$/, '');
    res.redirect(`${frontendUrl}/auth/callback?token=${result.accessToken}`);
  }

  @Post('demo')
  async createDemoAccount(): Promise<AuthResult> {
    return this.authService.createDemoAccount();
  }

  @Delete('demo')
  @UseGuards(JwtAuthGuard)
  async deleteDemoAccount(@CurrentUser() user: AuthPayload): Promise<{ success: boolean }> {
    await this.authService.deleteDemoAccount(user.sub);
    return { success: true };
  }
}

