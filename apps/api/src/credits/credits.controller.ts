import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { UserId } from '../auth/current-user.decorator';
import { CreditsService } from './credits.service';
import {
  FIVE_STAR_REVIEW_BONUS,
  MINUTES_PER_CREDIT,
  SIGNUP_BONUS,
  badgeBonus,
} from './credits.rules';

@Controller('credits')
@UseGuards(AuthGuard)
export class CreditsController {
  constructor(private creditsService: CreditsService) {}

  @Get()
  async getCredits(@UserId() userId: string) {
    return {
      ...(await this.creditsService.getSummary(userId)),
      // Sent with the wallet so the web app never hard-codes the economy.
      rules: {
        minutesPerCredit: MINUTES_PER_CREDIT,
        signupBonus: SIGNUP_BONUS,
        fiveStarReviewBonus: FIVE_STAR_REVIEW_BONUS,
        badgeBonuses: {
          firstSwap: badgeBonus('First Swap'),
          verifiedSkill: badgeBonus('Verified'),
          mentor: badgeBonus('Mentor'),
          topRated: badgeBonus('Top Rated'),
        },
      },
    };
  }
}
