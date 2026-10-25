import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RedemptionStatus, ReportStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RewardsService } from '../rewards/rewards.service';
import { isAdminEmail } from './admin.guard';
import { CreateRewardDto, UpdateRewardDto } from './admin.dto';

const personSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  suspendedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private rewardsService: RewardsService,
  ) {}

  async summary() {
    const [users, suspendedUsers, openReports, pendingRedemptions] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { suspendedAt: { not: null } } }),
        this.prisma.report.count({ where: { status: 'OPEN' } }),
        this.prisma.redemption.count({ where: { status: 'PENDING' } }),
      ]);
    return { users, suspendedUsers, openReports, pendingRedemptions };
  }

  listReports(status: ReportStatus) {
    return this.prisma.report.findMany({
      where: { status },
      orderBy: { createdAt: status === 'OPEN' ? 'asc' : 'desc' },
      take: 100,
      select: {
        id: true,
        reason: true,
        details: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        reporter: { select: personSelect },
        reported: {
          select: {
            ...personSelect,
            _count: { select: { reportsReceived: true } },
          },
        },
      },
    });
  }

  async resolveReport(id: string, status: 'RESOLVED' | 'DISMISSED') {
    const { count } = await this.prisma.report.updateMany({
      where: { id, status: 'OPEN' },
      data: { status, resolvedAt: new Date() },
    });
    if (count === 0) {
      throw new BadRequestException('Report not found or already closed');
    }
    return { id, status };
  }

  async listUsers(search?: string) {
    const query = search?.trim();
    const users = await this.prisma.user.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        ...personSelect,
        credits: true,
        createdAt: true,
        _count: { select: { reportsReceived: true } },
      },
    });
    return users.map(({ _count, ...user }) => ({
      ...user,
      reportCount: _count.reportsReceived,
      isAdmin: isAdminEmail(user.email),
    }));
  }

  /**
   * Suspends an account: it can no longer sign in or refresh, disappears
   * from Discover and the leaderboard, and cannot connect to chat.
   */
  async setSuspended(actorId: string, userId: string, suspended: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (suspended && (user.id === actorId || isAdminEmail(user.email))) {
      throw new ForbiddenException('Admins cannot be suspended');
    }

    // ponytail: an access token already issued stays valid for up to 15
    // minutes; check suspendedAt in AuthGuard if that window matters.
    await this.prisma.user.update({
      where: { id: userId },
      data: suspended
        ? { suspendedAt: new Date(), refreshTokenHash: null }
        : { suspendedAt: null },
    });
    return { id: userId, suspended };
  }

  listRedemptions(status: RedemptionStatus) {
    return this.prisma.redemption.findMany({
      where: { status },
      orderBy: { createdAt: status === 'PENDING' ? 'asc' : 'desc' },
      take: 100,
      select: {
        id: true,
        rewardId: true,
        title: true,
        cost: true,
        status: true,
        note: true,
        createdAt: true,
        updatedAt: true,
        user: { select: personSelect },
      },
    });
  }

  async fulfilRedemption(id: string, note?: string) {
    const { count } = await this.prisma.redemption.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'FULFILLED', note },
    });
    if (count === 0) {
      throw new BadRequestException('Request not found or already handled');
    }
    return { id, status: 'FULFILLED' as const };
  }

  rejectRedemption(id: string) {
    return this.rewardsService.refund(id);
  }

  /** Every reward, including hidden ones, with how often each was redeemed. */
  async listRewards() {
    const [rewards, counts] = await Promise.all([
      this.prisma.reward.findMany({
        orderBy: [{ active: 'desc' }, { cost: 'asc' }, { title: 'asc' }],
      }),
      this.prisma.redemption.groupBy({
        by: ['rewardId'],
        where: { status: { not: 'CANCELLED' } },
        _count: { _all: true },
      }),
    ]);
    return rewards.map((reward) => ({
      ...reward,
      redeemed:
        counts.find((row) => row.rewardId === reward.id)?._count._all ?? 0,
    }));
  }

  createReward(dto: CreateRewardDto) {
    return this.prisma.reward.create({
      data: { ...dto, stock: dto.stock ?? null },
    });
  }

  async updateReward(id: string, dto: UpdateRewardDto) {
    const exists = await this.prisma.reward.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Reward not found');
    return this.prisma.reward.update({ where: { id }, data: dto });
  }
}
