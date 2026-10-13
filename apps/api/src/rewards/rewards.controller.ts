import {
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
import { RewardsService } from './rewards.service';

@Controller('rewards')
@UseGuards(AuthGuard)
export class RewardsController {
  constructor(private rewardsService: RewardsService) {}

  @Get()
  list(@UserId() userId: string) {
    return this.rewardsService.list(userId);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post(':rewardId/redeem')
  redeem(@UserId() userId: string, @Param('rewardId') rewardId: string) {
    return this.rewardsService.redeem(userId, rewardId);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(200)
  @Post('redemptions/:id/cancel')
  cancel(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) redemptionId: string,
  ) {
    return this.rewardsService.cancel(userId, redemptionId);
  }
}
