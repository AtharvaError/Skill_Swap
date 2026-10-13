import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/auth.guard';
import { UserId } from '../auth/current-user.decorator';
import { MatchesService } from './matches.service';

@Controller('matches')
@UseGuards(AuthGuard)
export class MatchesController {
  constructor(private matchesService: MatchesService) {}

  @Get()
  getMatches(@UserId() userId: string, @Query('q') search?: string) {
    return this.matchesService.getSuggestions(
      userId,
      typeof search === 'string' ? search.slice(0, 100) : undefined,
    );
  }

  @Get('requests')
  getRequests(@UserId() userId: string) {
    return this.matchesService.getRequests(userId);
  }

  @Get('connections')
  getConnections(@UserId() userId: string) {
    return this.matchesService.getConnections(userId);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(200)
  @Post('connect/:userId')
  connect(
    @UserId() userId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.matchesService.connect(userId, targetUserId);
  }

  @HttpCode(200)
  @Post(':matchId/accept')
  accept(
    @UserId() userId: string,
    @Param('matchId', ParseUUIDPipe) matchId: string,
  ) {
    return this.matchesService.respond(userId, matchId, true);
  }

  @HttpCode(200)
  @Post(':matchId/decline')
  decline(
    @UserId() userId: string,
    @Param('matchId', ParseUUIDPipe) matchId: string,
  ) {
    return this.matchesService.respond(userId, matchId, false);
  }

  @HttpCode(204)
  @Delete(':matchId')
  async withdraw(
    @UserId() userId: string,
    @Param('matchId', ParseUUIDPipe) matchId: string,
  ) {
    await this.matchesService.withdraw(userId, matchId);
  }

  @Get(':matchId')
  getMatch(
    @UserId() userId: string,
    @Param('matchId', ParseUUIDPipe) matchId: string,
  ) {
    return this.matchesService.getMatchDetail(userId, matchId);
  }

  @Get(':matchId/messages')
  getMessages(
    @UserId() userId: string,
    @Param('matchId', ParseUUIDPipe) matchId: string,
  ) {
    return this.matchesService.getMessagesForMatch(userId, matchId);
  }
}
