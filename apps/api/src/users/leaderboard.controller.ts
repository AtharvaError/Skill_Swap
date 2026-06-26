import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('leaderboard')
@UseGuards(AuthGuard)
export class LeaderboardController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getLeaderboard() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        ratingAvg: true,
        badges: {
          select: {
            badgeId: true,
          },
        },
        matchesAsA: {
          select: {
            sessions: {
              where: { status: 'COMPLETED' },
              select: { id: true },
            },
          },
        },
        matchesAsB: {
          select: {
            sessions: {
              where: { status: 'COMPLETED' },
              select: { id: true },
            },
          },
        },
      },
    });

    const rankedUsers = users.map((user) => {
      const completedSessionsCount =
        user.matchesAsA.reduce((count, match) => count + match.sessions.length, 0) +
        user.matchesAsB.reduce((count, match) => count + match.sessions.length, 0);

      return {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        ratingAvg: user.ratingAvg || 0.0,
        badgeCount: user.badges.length,
        completedSessions: completedSessionsCount,
      };
    });

    // Rank by completed sessions first (descending), then by ratingAvg (descending)
    rankedUsers.sort((a, b) => {
      if (b.completedSessions !== a.completedSessions) {
        return b.completedSessions - a.completedSessions;
      }
      return b.ratingAvg - a.ratingAvg;
    });

    return rankedUsers;
  }
}
