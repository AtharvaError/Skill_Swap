import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { LeaderboardController } from './leaderboard.controller';

@Module({
  controllers: [UsersController, LeaderboardController]
})
export class UsersModule {}
