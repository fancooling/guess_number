import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginResponse } from '../../common/types/auth';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('google')
  async loginWithGoogle(@Body('idToken') idToken: string): Promise<LoginResponse> {
    if (!idToken) {
      throw new UnauthorizedException('Missing idToken');
    }
    try {
      return await this.authService.loginWithGoogle(idToken);
    } catch (e: any) {
      console.error('Google auth error:', e.message);
      throw new UnauthorizedException('Invalid Google token: ' + e.message);
    }
  }

  @Post('guest')
  async loginAsGuest(): Promise<LoginResponse> {
    return this.authService.loginAsGuest();
  }
}
