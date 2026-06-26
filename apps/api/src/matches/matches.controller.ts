import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Throttle } from '@nestjs/throttler';
import { MatchesService } from './matches.service';
import type { Request } from 'express';

@Controller('matches')
@UseGuards(AuthGuard)
export class MatchesController {
  constructor(private matchesService: MatchesService) {}

  @Get()
  async getMatches(@Req() req: Request & { user?: any }) {
    return this.matchesService.getTopMatches(req.user.sub);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('connect/:userId')
  async connect(@Req() req: Request & { user?: any }, @Param('userId') userId: string) {
    return this.matchesService.connect(req.user.sub, userId);
  }

  @Get(':matchId/messages')
  async getMessages(
    @Req() req: Request & { user?: any },
    @Param('matchId') matchId: string,
  ) {
    return this.matchesService.getMessagesForMatch(req.user.sub, matchId);
  }
}
