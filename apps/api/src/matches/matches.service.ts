import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { userSummarySelect } from '../users/user-summary';
import { visibleTo } from '../users/visibility';
import { computeMatchScore } from './match-score';

const MAX_SUGGESTIONS = 30;
const MESSAGE_HISTORY_LIMIT = 200;

export type ConnectionDirection = 'outgoing' | 'incoming';

@Injectable()
export class MatchesService {
  constructor(private prisma: PrismaService) {}

  private involving(userId: string) {
    return { OR: [{ userAId: userId }, { userBId: userId }] };
  }

  /**
   * Loads a match the user takes part in. Missing and foreign matches both
   * give 404 so match ids can't be probed.
   */
  async getParticipantMatch(userId: string, matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        status: true,
        userAId: true,
        userBId: true,
        createdAt: true,
        userA: { select: userSummarySelect },
        userB: { select: userSummarySelect },
      },
    });

    if (!match || (match.userAId !== userId && match.userBId !== userId)) {
      throw new NotFoundException('Match not found');
    }
    return match;
  }

  /** Ranked swap partners for the user, optionally filtered by a search. */
  async getSuggestions(userId: string, search?: string) {
    const skillSelect = {
      select: { skill: { select: { name: true, category: true } } },
    };

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        availability: true,
        offeredSkills: skillSelect,
        wantedSkills: skillSelect,
      },
    });

    if (!currentUser) {
      throw new NotFoundException('Current user not found');
    }

    const completedCount = {
      select: {
        _count: { select: { sessions: { where: { status: 'COMPLETED' } } } },
      },
    } as const;

    const [otherUsers, matchRecords] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { not: userId }, ...visibleTo(userId) },
        select: {
          ...userSummarySelect,
          bio: true,
          availability: true,
          offeredSkills: skillSelect,
          wantedSkills: skillSelect,
          matchesAsA: completedCount,
          matchesAsB: completedCount,
          _count: { select: { reviewsGotten: true } },
        },
      }),
      this.prisma.match.findMany({
        where: this.involving(userId),
        select: { id: true, userAId: true, userBId: true, status: true },
      }),
    ]);

    const matchByOtherId = new Map(
      matchRecords.map((match) => [
        match.userAId === userId ? match.userBId : match.userAId,
        match,
      ]),
    );

    const candidates = otherUsers.map((other) => ({
      ...other,
      offered: other.offeredSkills.map((item) => item.skill),
      wanted: other.wantedSkills.map((item) => item.skill),
      completedSessions: [...other.matchesAsA, ...other.matchesAsB].reduce(
        (total, match) => total + match._count.sessions,
        0,
      ),
    }));

    const maxCompletedSessions = Math.max(
      0,
      ...candidates.map((candidate) => candidate.completedSessions),
    );

    const me = {
      offered: currentUser.offeredSkills.map((item) => item.skill),
      wanted: currentUser.wantedSkills.map((item) => item.skill),
      availability: currentUser.availability,
    };

    const query = search?.trim().toLowerCase();

    return candidates
      .filter((candidate) => {
        if (!query) return true;
        return [
          candidate.name,
          candidate.college ?? '',
          ...candidate.offered.flatMap((s) => [s.name, s.category]),
          ...candidate.wanted.flatMap((s) => [s.name, s.category]),
        ].some((value) => value.toLowerCase().includes(query));
      })
      .map((candidate) => {
        const result = computeMatchScore(
          me,
          {
            offered: candidate.offered,
            wanted: candidate.wanted,
            availability: candidate.availability,
            ratingAvg: candidate.ratingAvg,
            reviewCount: candidate._count.reviewsGotten,
            completedSessions: candidate.completedSessions,
          },
          maxCompletedSessions,
        );
        const match = matchByOtherId.get(candidate.id);
        const connected = match && match.status !== 'REJECTED' ? match : null;

        return {
          userId: candidate.id,
          name: candidate.name,
          avatarUrl: candidate.avatarUrl,
          college: candidate.college,
          bio: candidate.bio,
          ratingAvg: candidate.ratingAvg ?? 0,
          reviewCount: candidate._count.reviewsGotten,
          completedSessions: candidate.completedSessions,
          offeredSkills: candidate.offered,
          wantedSkills: candidate.wanted,
          matchId: connected?.id ?? null,
          connectionStatus: connected?.status ?? null,
          connectionDirection: connected
            ? connected.userAId === userId
              ? 'outgoing'
              : 'incoming'
            : null,
          isConnected: connected?.status === 'ACCEPTED',
          score: result.score,
          matchPercent: result.matchPercent,
          scoreBreakdown: result.breakdown,
          sharedAvailability: result.sharedAvailability,
          overlappingSkills: {
            wantedByMe: result.wantedByMe,
            offeredByMe: result.offeredByMe,
          },
        };
      })
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, MAX_SUGGESTIONS);
  }

  /**
   * Sends a connection request. If the other user has already asked to
   * connect, this accepts their request instead.
   */
  async connect(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException('You cannot connect with yourself');
    }

    // Blocked (either way) and suspended people are indistinguishable from
    // people who don't exist.
    const otherUser = await this.prisma.user.findFirst({
      where: { id: targetUserId, ...visibleTo(userId) },
      select: { id: true },
    });
    if (!otherUser) {
      throw new NotFoundException('Target user not found');
    }

    const existing = await this.prisma.match.findFirst({
      where: {
        OR: [
          { userAId: userId, userBId: targetUserId },
          { userAId: targetUserId, userBId: userId },
        ],
      },
    });

    if (!existing) {
      const created = await this.prisma.match.create({
        data: { userAId: userId, userBId: targetUserId, status: 'PENDING' },
      });
      return { matchId: created.id, status: created.status };
    }

    if (existing.status === 'ACCEPTED') {
      return { matchId: existing.id, status: existing.status };
    }

    if (existing.status === 'PENDING') {
      if (existing.userBId !== userId) {
        // Our own request is still waiting for an answer.
        return { matchId: existing.id, status: existing.status };
      }
      const accepted = await this.prisma.match.update({
        where: { id: existing.id },
        data: { status: 'ACCEPTED' },
      });
      return { matchId: accepted.id, status: accepted.status };
    }

    // A previously declined pair: re-open it as a fresh request from this user.
    const reopened = await this.prisma.match.update({
      where: { id: existing.id },
      data: { userAId: userId, userBId: targetUserId, status: 'PENDING' },
    });
    return { matchId: reopened.id, status: reopened.status };
  }

  /** Only the recipient of a pending request may accept or decline it. */
  async respond(userId: string, matchId: string, accept: boolean) {
    const match = await this.getParticipantMatch(userId, matchId);

    if (match.userBId !== userId) {
      throw new ForbiddenException(
        'Only the person who received this request can respond to it',
      );
    }
    if (match.status !== 'PENDING') {
      throw new BadRequestException('This request has already been answered');
    }

    const updated = await this.prisma.match.update({
      where: { id: matchId },
      data: { status: accept ? 'ACCEPTED' : 'REJECTED' },
    });
    return { matchId: updated.id, status: updated.status };
  }

  /** The requester can withdraw a request that has not been answered yet. */
  async withdraw(userId: string, matchId: string) {
    const match = await this.getParticipantMatch(userId, matchId);

    if (match.userAId !== userId || match.status !== 'PENDING') {
      throw new BadRequestException(
        'Only your own pending requests can be withdrawn',
      );
    }

    await this.prisma.match.delete({ where: { id: matchId } });
  }

  async getRequests(userId: string) {
    const pending = await this.prisma.match.findMany({
      where: { ...this.involving(userId), status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        userAId: true,
        userA: { select: userSummarySelect },
        userB: { select: userSummarySelect },
      },
    });

    const toRequest = (match: (typeof pending)[number]) => ({
      matchId: match.id,
      createdAt: match.createdAt,
      user: match.userAId === userId ? match.userB : match.userA,
    });

    return {
      incoming: pending.filter((m) => m.userAId !== userId).map(toRequest),
      outgoing: pending.filter((m) => m.userAId === userId).map(toRequest),
    };
  }

  /** Accepted connections with their latest message and next session. */
  async getConnections(userId: string) {
    const matches = await this.prisma.match.findMany({
      where: { ...this.involving(userId), status: 'ACCEPTED' },
      select: {
        id: true,
        updatedAt: true,
        userAId: true,
        userA: { select: userSummarySelect },
        userB: { select: userSummarySelect },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, createdAt: true, senderId: true },
        },
        sessions: {
          where: { status: 'SCHEDULED', scheduledAt: { gte: new Date() } },
          orderBy: { scheduledAt: 'asc' },
          take: 1,
          select: { id: true, scheduledAt: true, topic: true },
        },
      },
    });

    return matches
      .map((match) => ({
        matchId: match.id,
        user: match.userAId === userId ? match.userB : match.userA,
        lastMessage: match.messages[0] ?? null,
        nextSession: match.sessions[0] ?? null,
        lastActivityAt: match.messages[0]?.createdAt ?? match.updatedAt,
      }))
      .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());
  }

  /** A single match from the viewer's side, with the skills they can swap. */
  async getMatchDetail(userId: string, matchId: string) {
    const match = await this.getParticipantMatch(userId, matchId);
    const partner = match.userAId === userId ? match.userB : match.userA;

    const skillSelect = { select: { skill: { select: { name: true } } } };
    const [me, them] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { offeredSkills: skillSelect, wantedSkills: skillSelect },
      }),
      this.prisma.user.findUnique({
        where: { id: partner.id },
        select: { offeredSkills: skillSelect, wantedSkills: skillSelect },
      }),
    ]);

    const names = (items?: { skill: { name: string } }[]) =>
      new Set((items ?? []).map((item) => item.skill.name));
    const myWanted = names(me?.wantedSkills);
    const myOffered = names(me?.offeredSkills);

    return {
      matchId: match.id,
      status: match.status,
      direction: match.userAId === userId ? 'outgoing' : 'incoming',
      partner,
      // Topics worth scheduling a session about, in both directions.
      swappableSkills: [
        ...[...names(them?.offeredSkills)].filter((n) => myWanted.has(n)),
        ...[...names(them?.wantedSkills)].filter((n) => myOffered.has(n)),
      ],
    };
  }

  async getMessagesForMatch(userId: string, matchId: string) {
    const match = await this.getParticipantMatch(userId, matchId);
    if (match.status !== 'ACCEPTED') {
      throw new ForbiddenException(
        'You can chat once the connection request is accepted',
      );
    }

    const messages = await this.prisma.message.findMany({
      where: { matchId },
      orderBy: { createdAt: 'desc' },
      take: MESSAGE_HISTORY_LIMIT,
      select: {
        id: true,
        matchId: true,
        senderId: true,
        content: true,
        createdAt: true,
        sender: { select: { name: true } },
      },
    });

    return messages.reverse().map(({ sender, ...message }) => ({
      ...message,
      senderName: sender.name,
    }));
  }
}
