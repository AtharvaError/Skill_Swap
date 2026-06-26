import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface MatchScoreBreakdown {
  skillOverlap: number;
  availabilityOverlap: number;
  ratingScore: number;
  experienceScore: number;
}

interface OverlappingSkill {
  name: string;
  category: string;
}

@Injectable()
export class MatchesService {
  constructor(private prisma: PrismaService) {}

  private normalizeRating(ratingAvg: number | null | undefined) {
    return Math.min(1, Math.max(0, (ratingAvg ?? 0) / 5));
  }

  private computeAvailabilityOverlap(
    currentOfferedCategories: Set<string>,
    currentWantedCategories: Set<string>,
    otherOfferedCategories: Set<string>,
    otherWantedCategories: Set<string>,
  ) {
    const overlapOfferedToWanted = [...currentOfferedCategories].filter((category) => otherWantedCategories.has(category)).length;
    const overlapWantedToOffered = [...currentWantedCategories].filter((category) => otherOfferedCategories.has(category)).length;
    const totalCategories = Math.max(
      currentOfferedCategories.size + currentWantedCategories.size,
      otherOfferedCategories.size + otherWantedCategories.size,
      1,
    );

    return (overlapOfferedToWanted + overlapWantedToOffered) / totalCategories;
  }

  async getTopMatches(userId: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        offeredSkills: { include: { skill: true } },
        wantedSkills: { include: { skill: true } },
      },
    });

    if (!currentUser) {
      throw new NotFoundException('Current user not found');
    }

    const currentOfferedSkills = currentUser.offeredSkills.map((item) => item.skill);
    const currentWantedSkills = currentUser.wantedSkills.map((item) => item.skill);
    const currentOfferedNames = new Set(currentOfferedSkills.map((skill) => skill.name));
    const currentWantedNames = new Set(currentWantedSkills.map((skill) => skill.name));
    const currentOfferedCategories = new Set(currentOfferedSkills.map((skill) => skill.category));
    const currentWantedCategories = new Set(currentWantedSkills.map((skill) => skill.category));

    const otherUsers = await this.prisma.user.findMany({
      where: { id: { not: userId } },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        college: true,
        ratingAvg: true,
        offeredSkills: { include: { skill: true } },
        wantedSkills: { include: { skill: true } },
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

    const matchRecords = await this.prisma.match.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userAId: true,
        userBId: true,
        status: true,
      },
    });

    const matchByOtherId = new Map<string, { id: string; status: string }>();
    for (const match of matchRecords) {
      const otherId = match.userAId === userId ? match.userBId : match.userAId;
      if (!matchByOtherId.has(otherId)) {
        matchByOtherId.set(otherId, { id: match.id, status: match.status });
      }
    }

    const otherUsersWithExperience = otherUsers.map((other) => {
      const completedSessions =
        other.matchesAsA.reduce((count, match) => count + match.sessions.length, 0) +
        other.matchesAsB.reduce((count, match) => count + match.sessions.length, 0);

      return {
        ...other,
        completedSessions,
      };
    });

    const maxCompletedSessions = Math.max(...otherUsersWithExperience.map((user) => user.completedSessions), 1);

    const results = otherUsersWithExperience.map((other) => {
      const otherOfferedSkills = other.offeredSkills.map((item) => item.skill);
      const otherWantedSkills = other.wantedSkills.map((item) => item.skill);
      const otherOfferedNames = new Set(otherOfferedSkills.map((skill) => skill.name));
      const otherWantedNames = new Set(otherWantedSkills.map((skill) => skill.name));
      const otherOfferedCategories = new Set(otherOfferedSkills.map((skill) => skill.category));
      const otherWantedCategories = new Set(otherWantedSkills.map((skill) => skill.category));

      const matchedWantedByUser = otherOfferedSkills.filter((skill) => currentWantedNames.has(skill.name));
      const matchedOfferedByUser = otherWantedSkills.filter((skill) => currentOfferedNames.has(skill.name));
      const skillOverlap = matchedWantedByUser.length + matchedOfferedByUser.length;
      const availabilityOverlap = this.computeAvailabilityOverlap(
        currentOfferedCategories,
        currentWantedCategories,
        otherOfferedCategories,
        otherWantedCategories,
      );
      const ratingScore = this.normalizeRating(other.ratingAvg);
      const experienceScore = maxCompletedSessions > 0 ? other.completedSessions / maxCompletedSessions : 0;
      const score =
        skillOverlap * 0.5 +
        availabilityOverlap * 0.2 +
        ratingScore * 0.15 +
        experienceScore * 0.15;
      const matchRecord = matchByOtherId.get(other.id);

      return {
        userId: other.id,
        matchId: matchRecord?.id ?? other.id,
        isConnected: matchRecord?.status === 'ACCEPTED',
        name: other.name,
        avatarUrl: other.avatarUrl,
        college: other.college,
        score,
        matchPercent: Math.min(100, Math.round(score * 20)),
        scoreBreakdown: {
          skillOverlap,
          availabilityOverlap,
          ratingScore,
          experienceScore,
        },
        overlappingSkills: {
          wantedByMe: matchedWantedByUser.map((skill) => ({ name: skill.name, category: skill.category })),
          offeredByMe: matchedOfferedByUser.map((skill) => ({ name: skill.name, category: skill.category })),
        },
      };
    });

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  async connect(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException('You cannot connect with yourself');
    }

    const otherUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!otherUser) {
      throw new NotFoundException('Target user not found');
    }

    const existingMatch = await this.prisma.match.findFirst({
      where: {
        OR: [
          { userAId: userId, userBId: targetUserId },
          { userAId: targetUserId, userBId: userId },
        ],
      },
    });

    if (existingMatch) {
      const updated = await this.prisma.match.update({
        where: { id: existingMatch.id },
        data: { status: 'ACCEPTED' },
      });
      return { matchId: updated.id, status: updated.status };
    }

    const created = await this.prisma.match.create({
      data: {
        userAId: userId,
        userBId: targetUserId,
        status: 'ACCEPTED',
      },
    });

    return { matchId: created.id, status: created.status };
  }

  async getMessagesForMatch(userId: string, matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: true },
        },
      },
    });

    if (!match || (match.userAId !== userId && match.userBId !== userId)) {
      throw new NotFoundException('Match not found or not accessible');
    }

    return match.messages.map((message) => ({
      id: message.id,
      matchId: message.matchId,
      senderId: message.senderId,
      senderName: message.sender.name,
      content: message.content,
      createdAt: message.createdAt,
    }));
  }
}
