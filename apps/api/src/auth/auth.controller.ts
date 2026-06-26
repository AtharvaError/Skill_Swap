import { Body, Controller, Get, Post, Res, Req, UnauthorizedException } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import { generateToken } from './csrf.config';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
  ) {}

  @Get('csrf')
  async getCsrfToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = generateToken(req, res);
    return { csrfToken: token };
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('signup')
  async signup(@Body() dto: SignupDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.signup(dto);
    this.setCookies(res, tokens.access_token, tokens.refresh_token);
    return { message: 'Signup successful' };
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(dto);
    this.setCookies(res, tokens.access_token, tokens.refresh_token);
    return { message: 'Login successful' };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.['jwt_refresh'];
    if (refreshToken) {
      try {
        const payload = await this.jwtService.verifyAsync(refreshToken, {
          secret: process.env.JWT_REFRESH_SECRET!,
        });
        await this.authService.logout(payload.sub);
      } catch (err) {
        // Ignore and just clear cookies
      }
    }

    res.clearCookie('jwt', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    res.clearCookie('jwt_refresh', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth',
    });
    return { message: 'Logout successful' };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.['jwt_refresh'];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET!,
      });
      const tokens = await this.authService.refreshTokens(payload.sub, refreshToken);
      this.setCookies(res, tokens.access_token, tokens.refresh_token);
      return { message: 'Tokens refreshed' };
    } catch (err) {
      res.clearCookie('jwt', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
      res.clearCookie('jwt_refresh', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/auth',
      });
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('jwt', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });
    res.cookie('jwt_refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/auth',
    });
  }
}
