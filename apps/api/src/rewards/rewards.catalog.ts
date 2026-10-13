export interface Reward {
  id: string;
  title: string;
  description: string;
  category: string;
  /** In credits. One credit is 15 minutes of teaching. */
  cost: number;
}

/**
 * The rewards catalogue is a preview: nothing here is supplied by a real
 * partner yet, and redeeming only records a pending request (see
 * RewardsService). To go live, each item needs a funding source and a
 * fulfilment step, e.g. a gift-card provider API for the Google Play code.
 */
export const REWARDS: Reward[] = [
  {
    id: 'profile-spotlight',
    title: 'Profile spotlight',
    description: 'Appear at the top of Discover for one week.',
    category: 'SkillSwap',
    cost: 3,
  },
  {
    id: 'cafe-voucher',
    title: 'Campus café voucher',
    description: 'A ₹50 voucher to spend at a campus café.',
    category: 'Food and drink',
    cost: 12,
  },
  {
    id: 'course-coupon',
    title: 'Online course coupon',
    description: 'A discount coupon for a paid online course.',
    category: 'Learning',
    cost: 24,
  },
  {
    id: 'play-gift-code',
    title: 'Google Play gift code (₹100)',
    description: 'A redeem code for apps, games and books on Google Play.',
    category: 'Gift cards',
    cost: 40,
  },
];
