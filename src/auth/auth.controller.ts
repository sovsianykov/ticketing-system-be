import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';

import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';

import type { RequestWithUser } from '../common/types/user.types';

const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @UseGuards(ThrottlerGuard)
  @Throttle({ register: { ttl: 60000, limit: 5 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(
      req.user,
    );

    this.setRefreshCookie(res, refreshToken);

    return { accessToken };
  }

  // Token arrives in the request body, sent by the frontend after the user clicks the email link.
  // On success, sets the refresh token cookie and returns { accessToken, user } — mirroring login.
  @Post('verify-email')
  async verifyEmail(
    @Body('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.verifyEmail(token);

    this.setRefreshCookie(res, refreshToken);

    return { accessToken, user };
  }

  @Post('resend-verification')
  resendVerificationEmail(@Body('email') email: string) {
    return this.authService.resendVerificationEmail(email);
  }

  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  async refresh(
    @Request() req: RequestWithUser & { user: { rawRefreshToken: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.refreshTokens(
      req.user.id,
      req.user.rawRefreshToken,
    );

    this.setRefreshCookie(res, refreshToken);

    return { accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: RequestWithUser) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Request() req: RequestWithUser & { user: { rawRefreshToken?: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.user.id, req.user.rawRefreshToken);

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: this.configService.get<boolean>('app.isProduction'),
      sameSite: 'lax',
    });

    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete')
  async deleteUser(
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.deleteUser(req.user.id);

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: this.configService.get<boolean>('app.isProduction'),
      sameSite: 'lax',
    });

    return { message: 'User deleted' };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: this.configService.get<boolean>('app.isProduction'),
      sameSite: 'lax',
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
      path: '/',
    });
  }
}
