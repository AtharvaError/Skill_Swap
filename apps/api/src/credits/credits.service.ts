import { BadRequestException, Injectable } from '@nestjs/common';
import { CreditType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { redeemableCredits } from './credits.rules';

export type CreditTx = Prisma.TransactionClient;

export interface CreditEntry {
  userId: string;
  /** Always positive; the direction comes from grant() or spend(). */
  amount: number;
  type: CreditType;
  description: string;
  /** Makes the entry idempotent per user. See CreditTransaction.key. */
  key?: string;
  sessionId?: string;
}

const isDuplicateKey = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

/**
 * The only place that changes User.credits. Every change goes through
 * grant() or spend() inside a database transaction, so a balance always
 * equals the sum of its ledger rows.
 */
@Injectable()
export class CreditsService {
  constructor(private prisma: PrismaService) {}

  /** Runs ledger changes together with whatever else must succeed with them. */
  transaction<T>(work: (tx: CreditTx) => Promise<T>): Promise<T> {
    // Generous limits: a hosted database can be several hundred ms away.
    return this.prisma.$transaction(work, { maxWait: 10000, timeout: 20000 });
  }

  /**
   * Adds credits. With a key, a repeat of the same event is ignored and
   * false is returned.
   */
  async grant(tx: CreditTx, entry: CreditEntry): Promise<boolean> {
    if (entry.key) {
      const existing = await tx.creditTransaction.findUnique({
        where: { userId_key: { userId: entry.userId, key: entry.key } },
        select: { id: true },
      });
      if (existing) return false;
    }

    await tx.creditTransaction.create({ data: entry });
    await tx.user.update({
      where: { id: entry.userId },
      data: { credits: { increment: entry.amount } },
    });
    return true;
  }

  /** Removes credits, refusing to take the balance below zero. */
  async spend(tx: CreditTx, entry: CreditEntry): Promise<void> {
    // The balance check and the decrement are one statement, so two
    // simultaneous requests cannot both spend the same credits.
    const { count } = await tx.user.updateMany({
      where: { id: entry.userId, credits: { gte: entry.amount } },
      data: { credits: { decrement: entry.amount } },
    });
    if (count === 0) {
      throw new BadRequestException('You do not have enough credits');
    }

    await tx.creditTransaction.create({
      data: { ...entry, amount: -entry.amount },
    });
  }

  /** A single idempotent grant in its own transaction. */
  async grantOnce(entry: CreditEntry & { key: string }): Promise<boolean> {
    try {
      return await this.transaction((tx) => this.grant(tx, entry));
    } catch (error) {
      // Two requests raced to record the same event; the other one won.
      if (isDuplicateKey(error)) return false;
      throw error;
    }
  }

  /** Balance figures derived from the ledger. Pass tx to read inside one. */
  async getTotals(userId: string, client: CreditTx = this.prisma) {
    const [user, byType] = await Promise.all([
      client.user.findUniqueOrThrow({
        where: { id: userId },
        select: { credits: true },
      }),
      client.creditTransaction.groupBy({
        by: ['type'],
        where: { userId },
        _sum: { amount: true },
      }),
    ]);

    const sum = (type: CreditType) =>
      byType.find((row) => row.type === type)?._sum.amount ?? 0;

    const earnedTeaching = sum('LESSON_EARNED');
    const earnedBonuses =
      sum('SIGNUP_BONUS') + sum('ACHIEVEMENT') + sum('REVIEW_BONUS');
    // Both are stored signed: redemptions negative, their refunds positive.
    const redeemedNet = -(sum('REDEMPTION') + sum('REDEMPTION_REFUND'));

    return {
      balance: user.credits,
      earnedTeaching,
      earnedBonuses,
      redeemedNet,
      redeemable: redeemableCredits({
        balance: user.credits,
        earnedTeaching,
        redeemedNet,
      }),
    };
  }

  /** Everything the wallet shows: totals, credits in flight, and history. */
  async getSummary(userId: string) {
    const involvesMe = { OR: [{ userAId: userId }, { userBId: userId }] };

    const [totals, held, incoming, transactions] = await Promise.all([
      this.getTotals(userId),
      // Lessons I booked that have not happened yet: already deducted.
      this.prisma.session.aggregate({
        where: {
          status: 'SCHEDULED',
          match: involvesMe,
          AND: [{ teacherId: { not: null } }, { teacherId: { not: userId } }],
        },
        _sum: { creditCost: true },
      }),
      // Lessons I am due to teach: paid to me when they complete.
      this.prisma.session.aggregate({
        where: { status: 'SCHEDULED', teacherId: userId },
        _sum: { creditCost: true },
      }),
      this.prisma.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          amount: true,
          type: true,
          description: true,
          sessionId: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      ...totals,
      held: held._sum.creditCost ?? 0,
      incoming: incoming._sum.creditCost ?? 0,
      transactions,
    };
  }
}
