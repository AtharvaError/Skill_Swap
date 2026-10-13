import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { SIGNUP_BONUS } from '../credits/credits.rules';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private creditsService: CreditsService,
  ) {}

  async signup(dto: SignupDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
      },
    });

    await this.creditsService.grantOnce({
      userId: user.id,
      amount: SIGNUP_BONUS,
      type: 'SIGNUP_BONUS',
      description: 'Welcome bonus',
      key: 'signup',
    });

    return this.issueTokens(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user.id, user.email);
  }

  async logout(userId: string) {
    await this.prisma.user.updateMany({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Access Denied');
    }

    const presented = Buffer.from(this.hashRefreshToken(refreshToken));
    const stored = Buffer.from(user.refreshTokenHash);
    if (
      presented.length !== stored.length ||
      !timingSafeEqual(presented, stored)
    ) {
      throw new UnauthorizedException('Access Denied');
    }

    return this.issueTokens(user.id, user.email);
  }

  private async issueTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET!,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET!,
        expiresIn: '7d',
      }),
    ]);

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: this.hashRefreshToken(refreshToken) },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  /**
   * Refresh tokens are long random-looking JWTs, so a fast hash is enough.
   * bcrypt must not be used here: it only reads the first 72 bytes, which are
   * identical for every token issued to the same user, so rotated tokens
   * would keep matching.
   */
  private hashRefreshToken(refreshToken: string) {
    return createHash('sha256').update(refreshToken).digest('hex');
  }
}
