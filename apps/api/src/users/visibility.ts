import { Prisma } from '@prisma/client';

/**
 * Users the viewer may find and interact with: not suspended, and no block
 * in either direction. Applied wherever one user can discover or reach
 * another, so a block or suspension takes effect everywhere at once.
 */
export const visibleTo = (viewerId: string): Prisma.UserWhereInput => ({
  suspendedAt: null,
  blocksMade: { none: { blockedId: viewerId } },
  blockedBy: { none: { blockerId: viewerId } },
});
