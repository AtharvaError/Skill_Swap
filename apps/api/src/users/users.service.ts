import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarService } from '../calendar/calendar.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { userSummarySelect } from './user-summary';
import { isAdminEmail } from '../admin/admin.guard';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private calendarService: CalendarService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        college: true,
        avatarUrl: true,
        availability: true,
        credits: true,
        googleRefreshToken: true,
        ratingAvg: true,
        createdAt: true,
        badges: {
          orderBy: { earnedAt: 'desc' },
          select: {
            earnedAt: true,
            badge: { select: { id: true, name: true, criteria: true } },
          },
        },
        _count: { select: { reviewsGotten: true } },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const { googleRefreshToken, _count, ...rest } = user;
    return {
      ...rest,
      reviewCount: _count.reviewsGotten,
      hasGoogleCalendar: Boolean(googleRefreshToken),
      googleCalendarAvailable: this.calendarService.isConfigured(),
      isAdmin: isAdminEmail(user.email),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        bio: dto.bio,
        college: dto.college,
        avatarUrl: dto.avatarUrl,
        availability: dto.availability,
      },
    });
    return this.getMe(userId);
  }

  /** Everything the dashboard needs in one round trip. */
  async getOverview(userId: string) {
    const involvesMe = { OR: [{ userAId: userId }, { userBId: userId }] };
    const now = new Date();

    const [
      connections,
      incomingRequests,
      completedSessions,
      upcomingSessions,
      offeredSkills,
      wantedSkills,
      me,
    ] = await Promise.all([
      this.prisma.match.count({
        where: { ...involvesMe, status: 'ACCEPTED' },
      }),
      this.prisma.match.findMany({
        where: { userBId: userId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          createdAt: true,
          userA: { select: userSummarySelect },
        },
      }),
      this.prisma.session.count({
        where: { status: 'COMPLETED', match: involvesMe },
      }),
      this.prisma.session.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: { gte: new Date(now.getTime() - 4 * 60 * 60 * 1000) },
          match: involvesMe,
        },
        orderBy: { scheduledAt: 'asc' },
        take: 3,
        select: {
          id: true,
          topic: true,
          scheduledAt: true,
          durationMinutes: true,
          match: {
            select: {
              userA: { select: userSummarySelect },
              userB: { select: userSummarySelect },
            },
          },
        },
      }),
      this.prisma.offeredSkill.count({ where: { userId } }),
      this.prisma.wantedSkill.count({ where: { userId } }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          bio: true,
          availability: true,
          credits: true,
          ratingAvg: true,
          _count: { select: { reviewsGotten: true, badges: true } },
        },
      }),
    ]);

    if (!me) throw new NotFoundException('User not found');

    const pendingRequestCount = await this.prisma.match.count({
      where: { userBId: userId, status: 'PENDING' },
    });

    return {
      stats: {
        connections,
        pendingRequests: pendingRequestCount,
        completedSessions,
        badges: me._count.badges,
        credits: me.credits,
        reviewCount: me._count.reviewsGotten,
        ratingAvg: me.ratingAvg ?? 0,
      },
      profile: {
        hasBio: Boolean(me.bio),
        offeredSkills,
        wantedSkills,
        availabilitySlots: me.availability.length,
      },
      incomingRequests: incomingRequests.map((request) => ({
        matchId: request.id,
        createdAt: request.createdAt,
        user: request.userA,
      })),
      upcomingSessions: upcomingSessions.map((session) => ({
        id: session.id,
        topic: session.topic,
        scheduledAt: session.scheduledAt,
        durationMinutes: session.durationMinutes,
        partner:
          session.match.userA.id === userId
            ? session.match.userB
            : session.match.userA,
      })),
    };
  }

  /** Another user's public profile, plus how the viewer is connected to them. */
  async getPublicProfile(viewerId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...userSummarySelect,
        bio: true,
        availability: true,
        suspendedAt: true,
        createdAt: true,
        offeredSkills: {
          orderBy: { skill: { name: 'asc' } },
          select: {
            proficiency: true,
            skill: { select: { id: true, name: true, category: true } },
          },
        },
        wantedSkills: {
          orderBy: { skill: { name: 'asc' } },
          select: {
            skill: { select: { id: true, name: true, category: true } },
          },
        },
        badges: {
          orderBy: { earnedAt: 'desc' },
          select: {
            earnedAt: true,
            badge: { select: { id: true, name: true, criteria: true } },
          },
        },
        reviewsGotten: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            reviewer: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        _count: { select: { reviewsGotten: true } },
      },
    });

    const isMe = viewerId === userId;
    const blocks = isMe
      ? []
      : await this.prisma.block.findMany({
          where: {
            OR: [
              { blockerId: viewerId, blockedId: userId },
              { blockerId: userId, blockedId: viewerId },
            ],
          },
          select: { blockerId: true },
        });

    if (!user) throw new NotFoundException('User not found');
    const {
      offeredSkills,
      wantedSkills,
      reviewsGotten,
      _count,
      suspendedAt,
      ...rest
    } = user;

    // Someone who blocked you, or a suspended account, looks like nobody.
    if (!isMe && (suspendedAt || blocks.some((b) => b.blockerId === userId))) {
      throw new NotFoundException('User not found');
    }

    const [completedSessions, match] = await Promise.all([
      this.prisma.session.count({
        where: {
          status: 'COMPLETED',
          match: { OR: [{ userAId: userId }, { userBId: userId }] },
        },
      }),
      viewerId === userId
        ? null
        : this.prisma.match.findFirst({
            where: {
              OR: [
                { userAId: viewerId, userBId: userId },
                { userAId: userId, userBId: viewerId },
              ],
            },
            select: { id: true, status: true, userAId: true },
          }),
    ]);

    return {
      ...rest,
      isMe,
      blockedByMe: blocks.some((b) => b.blockerId === viewerId),
      reviewCount: _count.reviewsGotten,
      completedSessions,
      offeredSkills: offeredSkills.map((item) => ({
        skillId: item.skill.id,
        name: item.skill.name,
        category: item.skill.category,
        proficiency: item.proficiency,
      })),
      wantedSkills: wantedSkills.map((item) => ({
        skillId: item.skill.id,
        name: item.skill.name,
        category: item.skill.category,
      })),
      reviews: reviewsGotten,
      connection:
        match && match.status !== 'REJECTED'
          ? {
              matchId: match.id,
              status: match.status,
              direction:
                match.userAId === viewerId
                  ? ('outgoing' as const)
                  : ('incoming' as const),
            }
          : null,
    };
  }

  async getLeaderboard() {
    const users = await this.prisma.user.findMany({
      where: { suspendedAt: null },
      select: {
        ...userSummarySelect,
        _count: { select: { badges: true, reviewsGotten: true } },
        matchesAsA: {
          select: {
            _count: {
              select: { sessions: { where: { status: 'COMPLETED' } } },
            },
          },
        },
        matchesAsB: {
          select: {
            _count: {
              select: { sessions: { where: { status: 'COMPLETED' } } },
            },
          },
        },
      },
    });

    const ranked = users.map(({ _count, matchesAsA, matchesAsB, ...user }) => ({
      ...user,
      ratingAvg: user.ratingAvg ?? 0,
      badgeCount: _count.badges,
      reviewCount: _count.reviewsGotten,
      completedSessions: [...matchesAsA, ...matchesAsB].reduce(
        (total, match) => total + match._count.sessions,
        0,
      ),
    }));

    // Completed sessions first, then rating, then badges.
    ranked.sort(
      (a, b) =>
        b.completedSessions - a.completedSessions ||
        b.ratingAvg - a.ratingAvg ||
        b.badgeCount - a.badgeCount ||
        a.name.localeCompare(b.name),
    );

    return ranked.slice(0, 50);
  }
}
