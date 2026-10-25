import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';

@Injectable()
export class RewardsService {
  constructor(
    private prisma: PrismaService,
    private creditsService: CreditsService,
  ) {}

  async list(userId: string) {
    const [totals, catalog, redemptions] = await Promise.all([
      this.creditsService.getTotals(userId),
      this.prisma.reward.findMany({
        where: { active: true },
        orderBy: [{ cost: 'asc' }, { title: 'asc' }],
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          cost: true,
          stock: true,
        },
      }),
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
          note: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      balance: totals.balance,
      redeemable: totals.redeemable,
      catalog,
      redemptions,
    };
  }

  /**
   * Records a redemption request, deducts its cost and takes one from
   * stock. An admin fulfils it from the admin panel; until then the member
   * can cancel it for a refund.
   */
  async redeem(userId: string, rewardId: string) {
    return this.creditsService.transaction(async (tx) => {
      const reward = await tx.reward.findFirst({
        where: { id: rewardId, active: true },
      });
      if (!reward) throw new NotFoundException('Reward not found');

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

      if (reward.stock !== null) {
        // Conditional decrement: the last one can only be claimed once.
        const { count } = await tx.reward.updateMany({
          where: { id: reward.id, stock: { gt: 0 } },
          data: { stock: { decrement: 1 } },
        });
        if (count === 0) {
          throw new BadRequestException(`${reward.title} is out of stock`);
        }
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

  /** A member cancels their own pending request. */
  async cancel(userId: string, redemptionId: string) {
    const redemption = await this.prisma.redemption.findUnique({
      where: { id: redemptionId },
      select: { userId: true },
    });
    if (!redemption || redemption.userId !== userId) {
      throw new NotFoundException('Redemption not found');
    }
    return this.refund(redemptionId);
  }

  /**
   * Cancels a request that has not been fulfilled and refunds its cost.
   * Used by the member (via cancel) and by admins rejecting a request.
   * The reward goes back into stock.
   */
  async refund(redemptionId: string) {
    return this.creditsService.transaction(async (tx) => {
      const redemption = await tx.redemption.findUnique({
        where: { id: redemptionId },
      });
      if (!redemption) {
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

      // Put it back in stock (a no-op for unlimited or since-deleted rewards).
      await tx.reward.updateMany({
        where: { id: redemption.rewardId, stock: { not: null } },
        data: { stock: { increment: 1 } },
      });

      await this.creditsService.grant(tx, {
        userId: redemption.userId,
        amount: redemption.cost,
        type: 'REDEMPTION_REFUND',
        description: `Refund: ${redemption.title}`,
        key: `redemption:${redemption.id}:refund`,
      });

      return { id: redemption.id, status: 'CANCELLED' as const };
    });
  }
}
