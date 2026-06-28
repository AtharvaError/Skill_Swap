import { BadRequestException, Controller, Get, Query, Res, Req, UseGuards } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import type { Response, Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';

@Controller('calendar')
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  @Get('connect')
  @UseGuards(AuthGuard)
  async connect(@Req() req: Request & { user?: any }, @Res() res: Response) {
    const url = this.calendarService.getAuthorizationUrl(req.user.sub);
    res.redirect(url);
  }

  @Get('oauth2callback')
  async oauth2callback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    if (!code || !state) {
      throw new BadRequestException('Missing OAuth parameters');
    }

    const statePayload = this.calendarService.verifyState(state);
    const tokens = await this.calendarService.exchangeCode(code);
    await this.calendarService.saveRefreshToken(statePayload.userId, tokens.refresh_token!);

    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/schedule/success`);
  }
}
