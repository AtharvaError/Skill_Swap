import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { UsersService } from './users.service';

@Controller('leaderboard')
@UseGuards(AuthGuard)
export class LeaderboardController {
  constructor(private usersService: UsersService) {}

  @Get()
  getLeaderboard() {
    return this.usersService.getLeaderboard();
  }
}
