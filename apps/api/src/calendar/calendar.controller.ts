import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { UserId } from '../auth/current-user.decorator';
import { CalendarService } from './calendar.service';

@Controller('calendar')
export class CalendarController {
  private readonly logger = new Logger(CalendarController.name);

  constructor(private calendarService: CalendarService) {}

  private frontendUrl(path: string) {
    const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    return `${base}${path}`;
  }

  @Get('connect')
  @UseGuards(AuthGuard)
  connect(@UserId() userId: string, @Res() res: Response) {
    if (!this.calendarService.isConfigured()) {
      return res.redirect(this.frontendUrl('/schedule/success?status=error'));
    }
    res.redirect(this.calendarService.getAuthorizationUrl(userId));
  }

  @Get('oauth2callback')
  async oauth2callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Res() res: Response,
  ) {
    // This is a browser redirect from Google, so failures go back to the web
    // app rather than rendering a JSON error page.
    try {
      if (!code || !state) {
        throw new Error('Missing OAuth parameters');
      }
      const { userId } = this.calendarService.verifyState(state);
      const refreshToken = await this.calendarService.exchangeCode(code);
      await this.calendarService.saveRefreshToken(userId, refreshToken);
      return res.redirect(this.frontendUrl('/schedule/success'));
    } catch (error) {
      this.logger.warn(
        `Google OAuth callback failed: ${(error as Error).message}`,
      );
      return res.redirect(this.frontendUrl('/schedule/success?status=error'));
    }
  }

  @Delete('connection')
  @UseGuards(AuthGuard)
  @HttpCode(204)
  async disconnect(@UserId() userId: string) {
    await this.calendarService.saveRefreshToken(userId, null);
  }
}
