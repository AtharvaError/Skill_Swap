import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @Get('me')
  async getMe(@Req() req: Request & { user?: any }) {
    const userId = req.user.sub;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        college: true,
        avatarUrl: true,
        googleRefreshToken: true,
        ratingAvg: true,
        badges: {
          select: {
            earnedAt: true,
            badge: {
              select: {
                id: true,
                name: true,
                criteria: true,
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    const { googleRefreshToken, ...rest } = user;
    return {
      ...rest,
      hasGoogleCalendar: Boolean(googleRefreshToken),
    };
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Patch('me')
  async updateProfile(
    @Req() req: Request & { user?: any },
    @Body() dto: UpdateProfileDto,
  ) {
    const userId = req.user.sub;
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        bio: dto.bio,
        college: dto.college,
        avatarUrl: dto.avatarUrl,
      },
      select: { id: true, email: true, name: true, bio: true, college: true, avatarUrl: true },
    });
  }
}
