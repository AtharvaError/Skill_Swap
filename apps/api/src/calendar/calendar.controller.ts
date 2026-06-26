import { Controller, Get, Query, Res, Req, UseGuards } from '@nestjs/common';
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
      return res.status(400).send('Missing OAuth parameters');
    }

    const statePayload = JSON.parse(state) as { userId: string };
    const tokens = await this.calendarService.exchangeCode(code);
    await this.calendarService.saveRefreshToken(statePayload.userId, tokens.refresh_token!);

    return res.redirect('http://localhost:3000/schedule/success');
  }
}
