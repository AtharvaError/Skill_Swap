import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { SIGNUP_BONUS } from '../credits/credits.rules';
import { MailService } from '../mail/mail.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
// Don't email another link while a fresh one (under 2 minutes old) exists.
const RESET_RESEND_AFTER_MS = 2 * 60 * 1000;

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private creditsService: CreditsService,
    private mailService: MailService,
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
    // Only revealed after the password is proven, so it can't be probed.
    if (user.suspendedAt) {
      throw new ForbiddenException('This account has been suspended');
    }

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
    if (!user || !user.refreshTokenHash || user.suspendedAt) {
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

  /**
   * Emails a single-use reset link. Always succeeds from the caller's point
   * of view, so the response never reveals whether an email is registered.
   */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        suspendedAt: true,
        passwordResetExpires: true,
      },
    });
    if (!user || user.suspendedAt) return;

    const issuedRecently =
      user.passwordResetExpires &&
      user.passwordResetExpires.getTime() - RESET_TOKEN_TTL_MS >
        Date.now() - RESET_RESEND_AFTER_MS;
    if (issuedRecently) return;

    const token = randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetHash: sha256(token),
        passwordResetExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    await this.mailService.send(
      email,
      'Reset your SkillSwap password',
      [
        `Hi ${user.name},`,
        '',
        'Use this link to choose a new password. It works once and expires in an hour:',
        '',
        `${base}/reset-password?token=${token}`,
        '',
        "If you didn't ask for this, you can ignore this email.",
      ].join('\n'),
    );
  }

  /** Sets a new password and signs the account out everywhere. */
  async resetPassword(token: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetHash: sha256(token),
        passwordResetExpires: { gt: new Date() },
        suspendedAt: null,
      },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException(
        'This reset link is invalid or has expired. Request a new one.',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(password, 10),
        passwordResetHash: null,
        passwordResetExpires: null,
        refreshTokenHash: null,
      },
    });
    this.logger.log(`Password reset for user ${user.id}`);
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
