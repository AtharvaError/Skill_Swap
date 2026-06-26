import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DailyService } from '../daily/daily.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { google } from 'googleapis';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  constructor(
    private prisma: PrismaService,
    private dailyService: DailyService,
  ) {}

  private getOAuth2Client() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Google OAuth configuration is missing');
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  async createSession(userId: string, dto: CreateSessionDto) {
    const match = await this.prisma.match.findUnique({
      where: { id: dto.matchId },
      include: { userA: true, userB: true },
    });

    if (!match || (match.userAId !== userId && match.userBId !== userId)) {
      throw new UnauthorizedException('Match not found or accessible');
    }

    const otherUser = match.userAId === userId ? match.userB : match.userA;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Current user not found');
    }

    const userOAuth = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { googleRefreshToken: true },
    });

    if (!userOAuth?.googleRefreshToken) {
      throw new BadRequestException('Google Calendar not connected');
    }

    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: userOAuth.googleRefreshToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const start = new Date(dto.scheduledAt);
    const end = new Date(start.getTime() + dto.durationMinutes * 60000);

    const event = {
      summary: 'SkillSwap session',
      description: `SkillSwap pairing session between ${user.name} and ${otherUser.name}`,
      start: { dateTime: start.toISOString(), timeZone: 'UTC' },
      end: { dateTime: end.toISOString(), timeZone: 'UTC' },
      conferenceData: { createRequest: { requestId: `skillswap-${dto.matchId}-${Date.now()}` } },
      attendees: [
        { email: user.email, displayName: user.name },
        { email: otherUser.email, displayName: otherUser.name },
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
          { method: 'email', minutes: 60 },
        ],
      },
    };

    const insertResponse = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
    });

    const googleEventId = insertResponse.data.id;
    const googleMeetLink = insertResponse.data.hangoutLink ?? insertResponse.data.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video')?.uri;

    // Create Daily.co room for video calling
    let dailyRoomUrl: string | null = null;
    const session = await this.prisma.session.create({
      data: {
        matchId: dto.matchId,
        scheduledAt: start,
        durationMinutes: dto.durationMinutes,
        meetingLink: googleMeetLink,
        googleEventId,
        status: 'SCHEDULED',
      },
    });

    // Create Daily room asynchronously to avoid blocking session creation
    try {
      dailyRoomUrl = await this.dailyService.createRoom(
        session.id,
        dto.matchId,
        [user.name, otherUser.name],
      );

      if (dailyRoomUrl) {
        // Update session with Daily room URL
        await this.prisma.session.update({
          where: { id: session.id },
          data: { meetingLink: dailyRoomUrl },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to create Daily room for session ${session.id}:`, error);
      // Continue without Daily room - Google Meet will be the fallback
    }

    // Fetch updated session to ensure we return the Daily room URL if it was created
    const updatedSession = await this.prisma.session.findUnique({
      where: { id: session.id },
    });

    return updatedSession;
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        match: {
          include: { userA: true, userB: true },
        },
        reviews: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.match.userAId !== userId && session.match.userBId !== userId) {
      throw new UnauthorizedException('You do not have access to this session');
    }

    return session;
  }

  async listUserSessions(userId: string) {
    return this.prisma.session.findMany({
      where: {
        match: {
          OR: [{ userAId: userId }, { userBId: userId }],
        },
      },
      include: {
        match: {
          include: { userA: true, userB: true },
        },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async completeSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        match: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.match.userAId !== userId && session.match.userBId !== userId) {
      throw new UnauthorizedException('You do not have access to this session');
    }

    return this.prisma.session.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED' },
    });
  }

  async submitReview(userId: string, sessionId: string, dto: CreateReviewDto) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        match: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.match.userAId !== userId && session.match.userBId !== userId) {
      throw new UnauthorizedException('You do not have access to this session');
    }

    if (session.status !== 'COMPLETED') {
      throw new BadRequestException('Session must be marked completed first');
    }

    const revieweeId = session.match.userAId === userId ? session.match.userBId : session.match.userAId;

    // Check if reviewer already left a review
    const existingReview = await this.prisma.review.findFirst({
      where: {
        sessionId,
        reviewerId: userId,
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this session');
    }

    // Create review
    const review = await this.prisma.review.create({
      data: {
        sessionId,
        reviewerId: userId,
        revieweeId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    // Recompute and store reviewee's ratingAvg
    const reviews = await this.prisma.review.findMany({
      where: { revieweeId },
    });

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const ratingAvg = reviews.length > 0 ? sum / reviews.length : 0;

    await this.prisma.user.update({
      where: { id: revieweeId },
      data: { ratingAvg },
    });

    // Run badge awarding logic for the reviewee
    await this.awardBadges(revieweeId);

    return review;
  }

  async awardBadges(userId: string) {
    const reviewsReceived = await this.prisma.review.findMany({
      where: { revieweeId: userId },
      include: {
        reviewer: {
          include: {
            wantedSkills: true,
          },
        },
      },
    });

    const reviewee = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        offeredSkills: {
          include: { skill: true },
        },
      },
    });

    if (!reviewee) return;

    const totalReviews = reviewsReceived.length;
    const ratingAvg = reviewee.ratingAvg ?? 0;

    const badgesToAward: { name: string; criteria: string }[] = [];

    // 1. "Mentor" badge: 10+ completed sessions taught
    if (totalReviews >= 10) {
      badgesToAward.push({
        name: 'Mentor',
        criteria: 'Awarded for teaching 10+ completed sessions.',
      });
    }

    // 2. "Top Rated" badge: ratingAvg >= 4.8 with 5+ reviews
    if (totalReviews >= 5 && ratingAvg >= 4.8) {
      badgesToAward.push({
        name: 'Top Rated',
        criteria: 'Awarded for achieving a rating average of 4.8 or higher with at least 5 reviews.',
      });
    }

    // 3. "Verified [SkillName]" badge: for skills a user has taught 3+ times
    for (const os of reviewee.offeredSkills) {
      const teachCount = reviewsReceived.filter((review) =>
        review.reviewer.wantedSkills.some((ws) => ws.skillId === os.skillId),
      ).length;

      if (teachCount >= 3) {
        badgesToAward.push({
          name: `Verified ${os.skill.name}`,
          criteria: `Awarded for teaching ${os.skill.name} in 3 or more sessions.`,
        });
      }
    }

    // Award badges
    for (const b of badgesToAward) {
      let badge = await this.prisma.badge.findFirst({
        where: { name: b.name },
      });

      if (!badge) {
        badge = await this.prisma.badge.create({
          data: {
            name: b.name,
            criteria: b.criteria,
          },
        });
      }

      await this.prisma.userBadge.upsert({
        where: {
          userId_badgeId: {
            userId,
            badgeId: badge.id,
          },
        },
        update: {},
        create: {
          userId,
          badgeId: badge.id,
        },
      });
    }
  }
}
