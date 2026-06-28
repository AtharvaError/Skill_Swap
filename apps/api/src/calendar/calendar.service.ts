import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { google } from 'googleapis';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  private getOAuth2Client() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Google OAuth configuration is missing');
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  getAuthorizationUrl(userId: string) {
    const oauth2Client = this.getOAuth2Client();
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'openid',
    ];
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state: this.createSignedState(userId),
    });
  }

  verifyState(state: string): { userId: string; nonce?: string; iat: number } {
    const [encodedPayload, signature] = state.split('.');
    if (!encodedPayload || !signature) {
      throw new Error('Invalid OAuth state');
    }

    const expectedSignature = this.sign(encodedPayload);
    const signatureBuffer = Buffer.from(signature, 'base64url');
    const expectedBuffer = Buffer.from(expectedSignature, 'base64url');

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw new Error('Invalid OAuth state signature');
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as {
      userId?: string;
      nonce?: string;
      iat?: number;
    };

    if (!payload.userId || !payload.iat || Date.now() - payload.iat > 10 * 60 * 1000) {
      throw new Error('Expired OAuth state');
    }

    return { userId: payload.userId, nonce: payload.nonce, iat: payload.iat };
  }

  async exchangeCode(code: string) {
    const oauth2Client = this.getOAuth2Client();
    const tokenResponse = await oauth2Client.getToken(code);
    const tokens = tokenResponse.tokens;
    if (!tokens.refresh_token) {
      throw new Error('No refresh token returned from Google OAuth');
    }
    return tokens;
  }

  async saveRefreshToken(userId: string, refreshToken: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { googleRefreshToken: refreshToken },
    });
  }

  private createSignedState(userId: string) {
    const payload = Buffer.from(
      JSON.stringify({
        userId,
        nonce: randomUUID(),
        iat: Date.now(),
      }),
    ).toString('base64url');

    return `${payload}.${this.sign(payload)}`;
  }

  private sign(value: string) {
    const secret = process.env.CSRF_SECRET;
    if (!secret) {
      throw new Error('CSRF_SECRET is required to sign OAuth state');
    }

    return createHmac('sha256', secret).update(value).digest('base64url');
  }
}
