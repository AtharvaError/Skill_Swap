import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { google } from 'googleapis';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface CalendarEventInput {
  summary: string;
  description: string;
  start: Date;
  end: Date;
  attendees: { email: string; displayName: string }[];
  requestId: string;
}

export interface CalendarEventResult {
  eventId: string | null;
  htmlLink: string | null;
  meetLink: string | null;
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(private prisma: PrismaService) {}

  /** Google Calendar is optional; it is only offered when OAuth is set up. */
  isConfigured(): boolean {
    return Boolean(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_OAUTH_REDIRECT_URI,
    );
  }

  private getOAuth2Client() {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Google Calendar integration is not configured on this server',
      );
    }

    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_OAUTH_REDIRECT_URI,
    );
  }

  getAuthorizationUrl(userId: string) {
    const oauth2Client = this.getOAuth2Client();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      state: this.createSignedState(userId),
    });
  }

  verifyState(state: string): { userId: string } {
    const [encodedPayload, signature] = state.split('.');
    if (!encodedPayload || !signature) {
      throw new BadRequestException('Invalid OAuth state');
    }

    const signatureBuffer = Buffer.from(signature, 'base64url');
    const expectedBuffer = Buffer.from(this.sign(encodedPayload), 'base64url');

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw new BadRequestException('Invalid OAuth state signature');
    }

    let payload: { userId?: string; iat?: number };
    try {
      payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as { userId?: string; iat?: number };
    } catch {
      throw new BadRequestException('Invalid OAuth state');
    }

    if (
      !payload.userId ||
      !payload.iat ||
      Date.now() - payload.iat > 10 * 60 * 1000
    ) {
      throw new BadRequestException('Expired OAuth state');
    }

    return { userId: payload.userId };
  }

  async exchangeCode(code: string): Promise<string> {
    const oauth2Client = this.getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
      throw new BadRequestException(
        'No refresh token returned from Google OAuth',
      );
    }
    return tokens.refresh_token;
  }

  async saveRefreshToken(userId: string, refreshToken: string | null) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { googleRefreshToken: refreshToken },
    });
  }

  /**
   * Creates a calendar event with a Meet link on the user's primary calendar.
   * Returns null instead of throwing: a calendar outage must never block
   * scheduling a session.
   */
  async createEvent(
    refreshToken: string,
    input: CalendarEventInput,
  ): Promise<CalendarEventResult | null> {
    if (!this.isConfigured()) return null;

    try {
      const oauth2Client = this.getOAuth2Client();
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const { data } = await calendar.events.insert({
        calendarId: 'primary',
        conferenceDataVersion: 1,
        requestBody: {
          summary: input.summary,
          description: input.description,
          start: { dateTime: input.start.toISOString(), timeZone: 'UTC' },
          end: { dateTime: input.end.toISOString(), timeZone: 'UTC' },
          conferenceData: { createRequest: { requestId: input.requestId } },
          attendees: input.attendees,
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 30 },
              { method: 'email', minutes: 60 },
            ],
          },
        },
      });

      return {
        eventId: data.id ?? null,
        htmlLink: data.htmlLink ?? null,
        meetLink:
          data.hangoutLink ??
          data.conferenceData?.entryPoints?.find(
            (entry) => entry.entryPointType === 'video',
          )?.uri ??
          null,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create Google Calendar event: ${(error as Error).message}`,
      );
      return null;
    }
  }

  async deleteEvent(refreshToken: string, eventId: string): Promise<void> {
    if (!this.isConfigured()) return;

    try {
      const oauth2Client = this.getOAuth2Client();
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      await calendar.events.delete({ calendarId: 'primary', eventId });
    } catch (error) {
      this.logger.warn(
        `Failed to delete Google Calendar event ${eventId}: ${(error as Error).message}`,
      );
    }
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
