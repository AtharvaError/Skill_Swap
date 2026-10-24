import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';
import { userSummarySelect } from '../users/user-summary';
import { ReportUserDto } from './safety.dto';

@Injectable()
export class SafetyService {
  private readonly logger = new Logger(SafetyService.name);

  constructor(
    private prisma: PrismaService,
    private sessionsService: SessionsService,
  ) {}

  private async assertOtherUser(userId: string, targetId: string) {
    if (userId === targetId) {
      throw new BadRequestException('You cannot do that to yourself');
    }
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('User not found');
  }

  /**
   * Blocks someone: ends any connection with them and cancels upcoming
   * sessions (refunding held lesson credits). Visibility rules in
   * users/visibility.ts hide each from the other from then on.
   */
  async block(userId: string, targetId: string) {
    await this.assertOtherUser(userId, targetId);

    await this.prisma.block.upsert({
      where: {
        blockerId_blockedId: { blockerId: userId, blockedId: targetId },
      },
      update: {},
      create: { blockerId: userId, blockedId: targetId },
    });

    const match = await this.prisma.match.findFirst({
      where: {
        OR: [
          { userAId: userId, userBId: targetId },
          { userAId: targetId, userBId: userId },
        ],
      },
      select: {
        id: true,
        sessions: {
          where: { status: 'SCHEDULED', scheduledAt: { gt: new Date() } },
          select: { id: true },
        },
      },
    });
    if (!match) return { blocked: true };

    // Rejected matches can't chat or schedule (enforced where those happen).
    await this.prisma.match.update({
      where: { id: match.id },
      data: { status: 'REJECTED' },
    });
    for (const session of match.sessions) {
      await this.sessionsService
        .cancelSession(userId, session.id)
        .catch((error: Error) =>
          this.logger.warn(
            `Could not cancel session ${session.id} on block: ${error.message}`,
          ),
        );
    }
    return { blocked: true };
  }

  async unblock(userId: string, targetId: string) {
    await this.prisma.block.deleteMany({
      where: { blockerId: userId, blockedId: targetId },
    });
    return { blocked: false };
  }

  async listBlocked(userId: string) {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId: userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, blocked: { select: userSummarySelect } },
    });
    return blocks.map((block) => ({
      blockedAt: block.createdAt,
      user: block.blocked,
    }));
  }

  async report(userId: string, targetId: string, dto: ReportUserDto) {
    await this.assertOtherUser(userId, targetId);
    const report = await this.prisma.report.create({
      data: {
        reporterId: userId,
        reportedId: targetId,
        reason: dto.reason,
        details: dto.details,
      },
      select: { id: true, status: true, createdAt: true },
    });
    return report;
  }
}
