/**
 * The credit economy in one place.
 *
 * Credits are time: a lesson costs the learner 1 credit per 15 minutes and
 * pays the teacher the same amount. Bonuses add new credits to the system;
 * lessons only move existing credits between two people.
 */

export const MINUTES_PER_CREDIT = 15;

/** Enough for two hours of lessons, so a new member can start learning. */
export const SIGNUP_BONUS = 8;

export const FIVE_STAR_REVIEW_BONUS = 2;

const BADGE_BONUSES: Record<string, number> = {
  'First Swap': 4,
  Mentor: 20,
  'Top Rated': 20,
};
/** "Verified <skill>" badges, and any badge added later without its own value. */
const DEFAULT_BADGE_BONUS = 10;

/**
 * In a paid lesson the learner releases the payment by confirming the
 * session. If they never do, the teacher can confirm it themselves once this
 * long has passed since the scheduled end.
 */
export const TEACHER_CONFIRM_GRACE_MS = 24 * 60 * 60 * 1000;

export function lessonCost(durationMinutes: number): number {
  return Math.max(1, Math.round(durationMinutes / MINUTES_PER_CREDIT));
}

export function badgeBonus(badgeName: string): number {
  return BADGE_BONUSES[badgeName] ?? DEFAULT_BADGE_BONUS;
}

/**
 * How many credits can be exchanged for rewards.
 *
 * Only credits earned by teaching count: bonus credits can be spent on
 * lessons but never cashed out, which removes the incentive to create
 * accounts just to collect sign-up bonuses. Credits already spent on rewards
 * (net of refunds) are deducted, and the result can never exceed the balance.
 */
export function redeemableCredits(input: {
  balance: number;
  earnedTeaching: number;
  redeemedNet: number;
}): number {
  const teachingLeft = input.earnedTeaching - input.redeemedNet;
  return Math.max(0, Math.min(input.balance, teachingLeft));
}
