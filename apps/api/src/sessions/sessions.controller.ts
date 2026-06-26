import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Throttle } from '@nestjs/throttler';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import type { Request } from 'express';

@Controller('sessions')
@UseGuards(AuthGuard)
export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post()
  async createSession(
    @Req() req: Request & { user?: any },
    @Body() dto: CreateSessionDto,
  ) {
    return this.sessionsService.createSession(req.user.sub, dto);
  }

  @Get()
  async getSessions(@Req() req: Request & { user?: any }) {
    return this.sessionsService.listUserSessions(req.user.sub);
  }

  @Get(':id')
  async getSession(
    @Req() req: Request & { user?: any },
    @Param('id') sessionId: string,
  ) {
    return this.sessionsService.getSession(req.user.sub, sessionId);
  }

  @Post(':id/complete')
  async completeSession(
    @Req() req: Request & { user?: any },
    @Param('id') sessionId: string,
  ) {
    return this.sessionsService.completeSession(req.user.sub, sessionId);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post(':id/review')
  async submitReview(
    @Req() req: Request & { user?: any },
    @Param('id') sessionId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.sessionsService.submitReview(req.user.sub, sessionId, dto);
  }
}
