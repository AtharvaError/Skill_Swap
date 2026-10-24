import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { generateToken } from './csrf.config';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
} from './cookie.config';
import type { JwtPayload } from './current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
  ) {}

  @Get('csrf')
  getCsrfToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return { csrfToken: generateToken(req, res) };
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('signup')
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.signup(dto);
    this.setCookies(res, tokens.access_token, tokens.refresh_token);
    return { message: 'Signup successful' };
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(200)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(dto);
    this.setCookies(res, tokens.access_token, tokens.refresh_token);
    return { message: 'Login successful' };
  }

  @HttpCode(200)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = this.readRefreshToken(req);
    if (refreshToken) {
      try {
        const payload = await this.jwtService.verifyAsync<JwtPayload>(
          refreshToken,
          { secret: process.env.JWT_REFRESH_SECRET! },
        );
        await this.authService.logout(payload.sub);
      } catch {
        // An invalid or expired refresh token still gets its cookies cleared.
      }
    }

    this.clearCookies(res);
    return { message: 'Logout successful' };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(200)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return {
      message:
        'If an account exists for that email, a reset link is on its way.',
    };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(200)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password);
    return { message: 'Password updated. You can sign in now.' };
  }

  @HttpCode(200)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = this.readRefreshToken(req);
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        { secret: process.env.JWT_REFRESH_SECRET! },
      );
      const tokens = await this.authService.refreshTokens(
        payload.sub,
        refreshToken,
      );
      this.setCookies(res, tokens.access_token, tokens.refresh_token);
      return { message: 'Tokens refreshed' };
    } catch {
      this.clearCookies(res);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private readRefreshToken(req: Request): string | undefined {
    return (req.cookies as Record<string, string> | undefined)?.[
      REFRESH_COOKIE
    ];
  }

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie(ACCESS_COOKIE, accessToken, {
      ...accessCookieOptions(),
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...refreshCookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private clearCookies(res: Response) {
    res.clearCookie(ACCESS_COOKIE, accessCookieOptions());
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
  }
}
