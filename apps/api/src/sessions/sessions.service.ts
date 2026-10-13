import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DailyService } from '../daily/daily.service';
import { CalendarService } from '../calendar/calendar.service';
import { CreditsService } from '../credits/credits.service';
import {
  FIVE_STAR_REVIEW_BONUS,
  TEACHER_CONFIRM_GRACE_MS,
  badgeBonus,
  lessonCost,
} from '../credits/credits.rules';
import { userSummarySelect } from '../users/user-summary';
import { CreateSessionDto, SessionKind } from './dto/create-session.dto';
import { CreateReviewDto } from './dto/create-review.dto';

const sessionSelect = {
  id: true,
  matchId: true,
  createdById: true,
  topic: true,
  notes: true,
  teacherId: true,
  creditCost: true,
  scheduledAt: true,
  durationMinutes: true,
  meetingLink: true,
  googleHtmlLink: true,
  status: true,
  createdAt: true,
  match: {
    select: {
      id: true,
      userA: { select: userSummarySelect },
      userB: { select: userSummarySelect },
    },
  },
  reviews: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      reviewerId: true,
      revieweeId: true,
      rating: true,
      comment: true,
      createdAt: true,
    },
  },
} satisfies Prisma.SessionSelect;

type SessionRecord = Prisma.SessionGetPayload<{ select: typeof sessionSelect }>;

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private prisma: PrismaService,
    private dailyService: DailyService,
    private calendarService: CalendarService,
    private creditsService: CreditsService,
  ) {}

  /** Adds the viewer-relative fields the web app needs. */
  private present(session: SessionRecord, userId: string) {
    const { userA, userB } = session.match;
    return {
      ...session,
      partner: userA.id === userId ? userB : userA,
      hasReviewed: session.reviews.some((r) => r.reviewerId === userId),
      // In a paid lesson: which side of it the viewer is on. Null for a swap.
      role: !session.teacherId
        ? null
        : session.teacherId === userId
          ? ('teacher' as const)
          : ('learner' as const),
    };
  }

  /** The participant who pays for a lesson, or null for a skill swap. */
  private learnerOf(session: SessionRecord) {
    if (!session.teacherId) return null;
    const { userA, userB } = session.match;
    return userA.id === session.teacherId ? userB : userA;
  }

  /**
   * Loads a session the user takes part in. Missing and foreign sessions both
   * give 404 so session ids can't be probed.
   */
  private async getParticipantSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: sessionSelect,
    });

    if (
      !session ||
      (session.match.userA.id !== userId && session.match.userB.id !== userId)
    ) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  async createSession(userId: string, dto: CreateSessionDto) {
    const match = await this.prisma.match.findUnique({
      where: { id: dto.matchId },
      select: {
        status: true,
        userA: { select: { id: true, name: true, email: true } },
        userB: { select: { id: true, name: true, email: true } },
      },
    });

    if (!match || (match.userA.id !== userId && match.userB.id !== userId)) {
      throw new NotFoundException('Match not found');
    }
    if (match.status !== 'ACCEPTED') {
      throw new ForbiddenException(
        'You can schedule a session once the connection is accepted',
      );
    }

    const start = new Date(dto.scheduledAt);
    if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
      throw new BadRequestException('Session must be scheduled in the future');
    }
    const end = new Date(start.getTime() + dto.durationMinutes * 60000);

    const me = match.userA.id === userId ? match.userA : match.userB;
    const partner = match.userA.id === userId ? match.userB : match.userA;

    // A lesson is always booked by the learner, who pays for it. That way
    // nobody's credits are ever committed without their own action.
    const isLesson = dto.kind === SessionKind.LESSON;
    const creditCost = isLesson ? lessonCost(dto.durationMinutes) : 0;
    const title = dto.topic ?? 'SkillSwap session';

    const session = await this.creditsService.transaction(async (tx) => {
      const created = await tx.session.create({
        data: {
          matchId: dto.matchId,
          createdById: userId,
          topic: dto.topic,
          notes: dto.notes,
          teacherId: isLesson ? partner.id : null,
          creditCost,
          scheduledAt: start,
          durationMinutes: dto.durationMinutes,
          status: 'SCHEDULED',
        },
        select: { id: true },
      });

      if (isLesson) {
        // Held now, paid to the teacher on completion, refunded on cancel.
        await this.creditsService.spend(tx, {
          userId,
          amount: creditCost,
          type: 'LESSON_HOLD',
          description: `Booked: ${title} with ${partner.name}`,
          key: `session:${created.id}:hold`,
          sessionId: created.id,
        });
      }

      return created;
    });

    // Both integrations are optional and must never block scheduling.
    const { googleRefreshToken } = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { googleRefreshToken: true },
    });

    const [calendarEvent, dailyRoomUrl] = await Promise.all([
      googleRefreshToken
        ? this.calendarService.createEvent(googleRefreshToken, {
            summary: dto.topic
              ? `SkillSwap: ${dto.topic}`
              : 'SkillSwap session',
            description:
              `SkillSwap session between ${me.name} and ${partner.name}.` +
              (dto.notes ? `\n\n${dto.notes}` : ''),
            start,
            end,
            attendees: [
              { email: me.email, displayName: me.name },
              { email: partner.email, displayName: partner.name },
            ],
            requestId: `skillswap-${session.id}`,
          })
        : null,
      this.dailyService.createRoom(session.id, end),
    ]);

    // Prefer the embeddable Daily room, then Google Meet. With neither
    // configured, fall back to a free Jitsi room so every session has a link.
    const meetingLink =
      dailyRoomUrl ??
      calendarEvent?.meetLink ??
      `https://meet.jit.si/SkillSwap-${session.id}`;

    const updated = await this.prisma.session.update({
      where: { id: session.id },
      data: {
        meetingLink,
        googleEventId: calendarEvent?.eventId,
        googleHtmlLink: calendarEvent?.htmlLink,
      },
      select: sessionSelect,
    });

    return this.present(updated, userId);
  }

  async getSession(userId: string, sessionId: string) {
    return this.present(
      await this.getParticipantSession(userId, sessionId),
      userId,
    );
  }

  async listUserSessions(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: {
        match: { OR: [{ userAId: userId }, { userBId: userId }] },
      },
      select: sessionSelect,
      orderBy: { scheduledAt: 'desc' },
      take: 100,
    });
    return sessions.map((session) => this.present(session, userId));
  }

  async completeSession(userId: string, sessionId: string) {
    const session = await this.getParticipantSession(userId, sessionId);

    if (session.status === 'CANCELLED') {
      throw new BadRequestException('A cancelled session cannot be completed');
    }
    if (session.status === 'COMPLETED') {
      return this.present(session, userId);
    }
    if (session.scheduledAt.getTime() > Date.now()) {
      throw new BadRequestException(
        'Session cannot be completed before it starts',
      );
    }

    // Completing a paid lesson releases the learner's credits to the
    // teacher, so it is the learner's call. The teacher can only do it once
    // the learner has had a day to confirm (or cancel) after the lesson.
    const learner = this.learnerOf(session);
    if (learner && userId === session.teacherId) {
      const releaseAt =
        session.scheduledAt.getTime() +
        session.durationMinutes * 60000 +
        TEACHER_CONFIRM_GRACE_MS;
      if (Date.now() < releaseAt) {
        throw new ForbiddenException(
          `${learner.name} confirms this lesson to release your credits. If they have not done so 24 hours after it ends, you can confirm it yourself.`,
        );
      }
    }

    const updated = await this.creditsService.transaction(async (tx) => {
      // Conditional update: only one request can move it out of SCHEDULED,
      // so the teacher is never paid twice.
      const { count } = await tx.session.updateMany({
        where: { id: sessionId, status: 'SCHEDULED' },
        data: { status: 'COMPLETED' },
      });

      if (count === 1 && learner && session.teacherId) {
        await this.creditsService.grant(tx, {
          userId: session.teacherId,
          amount: session.creditCost,
          type: 'LESSON_EARNED',
          description: `Taught: ${session.topic ?? 'a lesson'} to ${learner.name}`,
          key: `session:${sessionId}:payout`,
          sessionId,
        });
      }

      return tx.session.findUniqueOrThrow({
        where: { id: sessionId },
        select: sessionSelect,
      });
    });

    await Promise.all([
      this.awardBadges(session.match.userA.id),
      this.awardBadges(session.match.userB.id),
    ]);

    return this.present(updated, userId);
  }

  async cancelSession(userId: string, sessionId: string) {
    const session = await this.getParticipantSession(userId, sessionId);

    if (session.status !== 'SCHEDULED') {
      throw new BadRequestException(
        `A ${session.status.toLowerCase()} session cannot be cancelled`,
      );
    }

    // Once a paid lesson has started, the learner cannot cancel it to get
    // their credits back; only the teacher can waive the payment.
    const learner = this.learnerOf(session);
    if (
      learner &&
      userId === learner.id &&
      session.scheduledAt.getTime() <= Date.now()
    ) {
      throw new ForbiddenException(
        'A paid lesson cannot be cancelled by the learner after it has started',
      );
    }

    const { googleEventId, createdById } =
      await this.prisma.session.findUniqueOrThrow({
        where: { id: sessionId },
        select: { googleEventId: true, createdById: true },
      });

    const updated = await this.creditsService.transaction(async (tx) => {
      const { count } = await tx.session.updateMany({
        where: { id: sessionId, status: 'SCHEDULED' },
        data: { status: 'CANCELLED' },
      });

      if (count === 1 && learner) {
        await this.creditsService.grant(tx, {
          userId: learner.id,
          amount: session.creditCost,
          type: 'LESSON_REFUND',
          description: `Refund: ${session.topic ?? 'lesson'} was cancelled`,
          key: `session:${sessionId}:refund`,
          sessionId,
        });
      }

      return tx.session.findUniqueOrThrow({
        where: { id: sessionId },
        select: sessionSelect,
      });
    });

    // Best-effort cleanup of the external resources.
    void this.dailyService.deleteRoom(sessionId);
    if (googleEventId && createdById) {
      const owner = await this.prisma.user.findUnique({
        where: { id: createdById },
        select: { googleRefreshToken: true },
      });
      if (owner?.googleRefreshToken) {
        void this.calendarService.deleteEvent(
          owner.googleRefreshToken,
          googleEventId,
        );
      }
    }

    return this.present(updated, userId);
  }

  async submitReview(userId: string, sessionId: string, dto: CreateReviewDto) {
    const session = await this.getParticipantSession(userId, sessionId);

    if (session.status !== 'COMPLETED') {
      throw new BadRequestException('Session must be marked completed first');
    }

    const { userA, userB } = session.match;
    const revieweeId = userA.id === userId ? userB.id : userA.id;

    const review = await this.prisma.review
      .create({
        data: {
          sessionId,
          reviewerId: userId,
          revieweeId,
          rating: dto.rating,
          comment: dto.comment,
        },
        select: {
          id: true,
          sessionId: true,
          reviewerId: true,
          revieweeId: true,
          rating: true,
          comment: true,
          createdAt: true,
        },
      })
      .catch((error: unknown) => {
        // One review per reviewer per session (unique index).
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException('You have already reviewed this session');
        }
        throw error;
      });

    const aggregate = await this.prisma.review.aggregate({
      where: { revieweeId },
      _avg: { rating: true },
    });
    await this.prisma.user.update({
      where: { id: revieweeId },
      data: { ratingAvg: aggregate._avg.rating ?? 0 },
    });

    if (dto.rating === 5) {
      await this.creditsService.grantOnce({
        userId: revieweeId,
        amount: FIVE_STAR_REVIEW_BONUS,
        type: 'REVIEW_BONUS',
        description: 'Five-star review received',
        key: `review:${review.id}`,
        sessionId,
      });
    }

    await this.awardBadges(revieweeId);

    return review;
  }

  /**
   * Grants every badge the user currently qualifies for, with its credit
   * bonus the first time each badge is earned. Idempotent.
   */
  async awardBadges(userId: string) {
    const [user, completedSessions, reviewsReceived] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          ratingAvg: true,
          offeredSkills: {
            select: { skillId: true, skill: { select: { name: true } } },
          },
        },
      }),
      this.prisma.session.count({
        where: {
          status: 'COMPLETED',
          match: { OR: [{ userAId: userId }, { userBId: userId }] },
        },
      }),
      this.prisma.review.findMany({
        where: { revieweeId: userId },
        select: {
          session: { select: { topic: true } },
          reviewer: { select: { wantedSkills: { select: { skillId: true } } } },
        },
      }),
    ]);

    if (!user) return;

    const badgesToAward: { name: string; criteria: string }[] = [];

    if (completedSessions >= 1) {
      badgesToAward.push({
        name: 'First Swap',
        criteria: 'Awarded for completing your first SkillSwap session.',
      });
    }

    if (completedSessions >= 10) {
      badgesToAward.push({
        name: 'Mentor',
        criteria: 'Awarded for completing 10 or more sessions.',
      });
    }

    if (reviewsReceived.length >= 5 && (user.ratingAvg ?? 0) >= 4.8) {
      badgesToAward.push({
        name: 'Top Rated',
        criteria:
          'Awarded for an average rating of 4.8 or higher across at least 5 reviews.',
      });
    }

    // "Verified <skill>": 3+ reviews from sessions about a skill the user
    // offers (by session topic, or because the reviewer wanted that skill).
    for (const offered of user.offeredSkills) {
      const skillName = offered.skill.name.toLowerCase();
      const teachCount = reviewsReceived.filter(
        (review) =>
          review.session.topic?.toLowerCase() === skillName ||
          review.reviewer.wantedSkills.some(
            (wanted) => wanted.skillId === offered.skillId,
          ),
      ).length;

      if (teachCount >= 3) {
        badgesToAward.push({
          name: `Verified ${offered.skill.name}`,
          criteria: `Awarded for teaching ${offered.skill.name} in 3 or more reviewed sessions.`,
        });
      }
    }

    for (const { name, criteria } of badgesToAward) {
      const badge = await this.prisma.badge.upsert({
        where: { name },
        update: {},
        create: { name, criteria },
      });

      await this.prisma.userBadge.upsert({
        where: { userId_badgeId: { userId, badgeId: badge.id } },
        update: {},
        create: { userId, badgeId: badge.id },
      });

      // Keyed on the badge, so the bonus is paid once however often this runs.
      await this.creditsService.grantOnce({
        userId,
        amount: badgeBonus(name),
        type: 'ACHIEVEMENT',
        description: `Badge earned: ${name}`,
        key: `badge:${badge.id}`,
      });
    }
  }
}
