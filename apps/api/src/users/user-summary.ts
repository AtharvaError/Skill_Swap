import { Prisma } from '@prisma/client';

/**
 * The only user fields that may be sent to *other* users. Always select
 * through this (never `include: { user: true }`) so password hashes and
 * OAuth/refresh tokens can't leak into a response.
 */
export const userSummarySelect = {
  id: true,
  name: true,
  avatarUrl: true,
  college: true,
  ratingAvg: true,
} satisfies Prisma.UserSelect;

export type UserSummary = Prisma.UserGetPayload<{
  select: typeof userSummarySelect;
}>;
