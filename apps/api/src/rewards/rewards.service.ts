import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { REWARDS } from './rewards.catalog';

@Injectable()
export class RewardsService {
  constructor(
    private prisma: PrismaService,
    private creditsService: CreditsService,
  ) {}

  async list(userId: string) {
    const [totals, redemptions] = await Promise.all([
      this.creditsService.getTotals(userId),
      this.prisma.redemption.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          rewardId: true,
          title: true,
          cost: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      // Rewards are not being issued yet; the web app says so prominently.
      preview: true,
      balance: totals.balance,
      redeemable: totals.redeemable,
      catalog: REWARDS,
      redemptions,
    };
  }

  /**
   * Records a redemption request and deducts its cost. Nothing is issued
   * automatically: the request stays PENDING until someone fulfils it, and
   * the member can cancel it for a refund in the meantime.
   */
  async redeem(userId: string, rewardId: string) {
    const reward = REWARDS.find((item) => item.id === rewardId);
    if (!reward) throw new NotFoundException('Reward not found');

    return this.creditsService.transaction(async (tx) => {
      // Serialise this member's redemptions: two at once must not both pass
      // the redeemable check below.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;

      const { redeemable, balance } = await this.creditsService.getTotals(
        userId,
        tx,
      );
      if (redeemable < reward.cost) {
        throw new BadRequestException(
          balance >= reward.cost
            ? `Only credits earned by teaching can be redeemed. You have ${redeemable} of the ${reward.cost} needed.`
            : `You need ${reward.cost} redeemable credits and have ${redeemable}.`,
        );
      }

      const redemption = await tx.redemption.create({
        data: {
          userId,
          rewardId: reward.id,
          title: reward.title,
          cost: reward.cost,
        },
        select: {
          id: true,
          rewardId: true,
          title: true,
          cost: true,
          status: true,
          createdAt: true,
        },
      });

      await this.creditsService.spend(tx, {
        userId,
        amount: reward.cost,
        type: 'REDEMPTION',
        description: `Redeemed: ${reward.title}`,
        key: `redemption:${redemption.id}`,
      });

      return redemption;
    });
  }

  /** Cancels a request that has not been fulfilled and refunds its cost. */
  async cancel(userId: string, redemptionId: string) {
    return this.creditsService.transaction(async (tx) => {
      const redemption = await tx.redemption.findUnique({
        where: { id: redemptionId },
      });
      if (!redemption || redemption.userId !== userId) {
        throw new NotFoundException('Redemption not found');
      }

      // Conditional update, so a double click cannot refund twice.
      const { count } = await tx.redemption.updateMany({
        where: { id: redemptionId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      if (count === 0) {
        throw new BadRequestException(
          `A ${redemption.status.toLowerCase()} redemption cannot be cancelled`,
        );
      }

      await this.creditsService.grant(tx, {
        userId,
        amount: redemption.cost,
        type: 'REDEMPTION_REFUND',
        description: `Refund: ${redemption.title}`,
        key: `redemption:${redemption.id}:refund`,
      });

      return { id: redemption.id, status: 'CANCELLED' as const };
    });
  }
}
