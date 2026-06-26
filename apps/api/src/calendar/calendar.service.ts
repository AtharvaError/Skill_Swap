import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { google } from 'googleapis';

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
      state: JSON.stringify({ userId }),
    });
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
}
