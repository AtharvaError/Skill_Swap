import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/auth.guard';
import { UserId } from '../auth/current-user.decorator';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('sessions')
@UseGuards(AuthGuard)
export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post()
  createSession(@UserId() userId: string, @Body() dto: CreateSessionDto) {
    return this.sessionsService.createSession(userId, dto);
  }

  @Get()
  getSessions(@UserId() userId: string) {
    return this.sessionsService.listUserSessions(userId);
  }

  @Get(':id')
  getSession(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) sessionId: string,
  ) {
    return this.sessionsService.getSession(userId, sessionId);
  }

  @HttpCode(200)
  @Post(':id/complete')
  completeSession(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) sessionId: string,
  ) {
    return this.sessionsService.completeSession(userId, sessionId);
  }

  @HttpCode(200)
  @Post(':id/cancel')
  cancelSession(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) sessionId: string,
  ) {
    return this.sessionsService.cancelSession(userId, sessionId);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post(':id/review')
  submitReview(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.sessionsService.submitReview(userId, sessionId, dto);
  }
}
