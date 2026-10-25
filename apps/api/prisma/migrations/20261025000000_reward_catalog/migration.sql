-- CreateTable
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "stock" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);


-- Carry over the catalogue that used to be hard-coded, keeping its ids so
-- existing redemptions still point at the right reward.
INSERT INTO "Reward" ("id", "title", "description", "category", "cost") VALUES
  ('profile-spotlight', 'Profile spotlight', 'Appear at the top of Discover for one week.', 'SkillSwap', 3),
  ('cafe-voucher', 'Campus café voucher', 'A ₹50 voucher to spend at a campus café.', 'Food and drink', 12),
  ('course-coupon', 'Online course coupon', 'A discount coupon for a paid online course.', 'Learning', 24),
  ('play-gift-code', 'Google Play gift code (₹100)', 'A redeem code for apps, games and books on Google Play.', 'Gift cards', 40);
