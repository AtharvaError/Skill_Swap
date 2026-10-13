import {
  badgeBonus,
  lessonCost,
  redeemableCredits,
  SIGNUP_BONUS,
} from './credits.rules';

describe('credit rules', () => {
  describe('lessonCost', () => {
    it('charges one credit per 15 minutes', () => {
      expect(lessonCost(15)).toBe(1);
      expect(lessonCost(30)).toBe(2);
      expect(lessonCost(45)).toBe(3);
      expect(lessonCost(60)).toBe(4);
      expect(lessonCost(120)).toBe(8);
    });

    it('never charges less than one credit', () => {
      expect(lessonCost(5)).toBe(1);
    });

    it('lets the sign-up bonus cover two hours of lessons', () => {
      expect(SIGNUP_BONUS).toBe(lessonCost(120));
    });
  });

  describe('badgeBonus', () => {
    it('uses the named value for known badges', () => {
      expect(badgeBonus('First Swap')).toBe(4);
      expect(badgeBonus('Mentor')).toBe(20);
    });

    it('falls back to the default for skill badges', () => {
      expect(badgeBonus('Verified Python')).toBe(10);
    });
  });

  describe('redeemableCredits', () => {
    it('excludes bonus credits', () => {
      // 8 sign-up + 4 badge + 6 taught: only the 6 can be redeemed.
      expect(
        redeemableCredits({ balance: 18, earnedTeaching: 6, redeemedNet: 0 }),
      ).toBe(6);
    });

    it('deducts what has already been redeemed', () => {
      expect(
        redeemableCredits({ balance: 15, earnedTeaching: 6, redeemedNet: 4 }),
      ).toBe(2);
    });

    it('is capped by the current balance', () => {
      // Taught 10, then spent most of it on lessons.
      expect(
        redeemableCredits({ balance: 3, earnedTeaching: 10, redeemedNet: 0 }),
      ).toBe(3);
    });

    it('never goes negative', () => {
      expect(
        redeemableCredits({ balance: 5, earnedTeaching: 2, redeemedNet: 6 }),
      ).toBe(0);
    });
  });
});
