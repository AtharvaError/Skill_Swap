export interface ScoredSkill {
  name: string;
  category: string;
}

export interface MatchCandidate {
  offered: ScoredSkill[];
  wanted: ScoredSkill[];
  availability: string[];
  /** Average review rating (0–5); ignored when there are no reviews. */
  ratingAvg: number | null;
  reviewCount: number;
  completedSessions: number;
}

export interface MatchScore {
  /** 0–1 */
  score: number;
  /** 0–100 */
  matchPercent: number;
  breakdown: {
    skill: number;
    availability: number;
    category: number;
    rating: number;
    experience: number;
  };
  /** Skills they offer that I want. */
  wantedByMe: ScoredSkill[];
  /** Skills I offer that they want. */
  offeredByMe: ScoredSkill[];
  sharedAvailability: string[];
}

export const MATCH_WEIGHTS = {
  skill: 0.55,
  availability: 0.15,
  category: 0.1,
  rating: 0.1,
  experience: 0.1,
} as const;

const key = (name: string) => name.trim().toLowerCase();

const ratio = (part: number, whole: number) =>
  whole > 0 ? Math.min(1, part / whole) : 0;

/**
 * Scores how good a swap partner `other` is for `me`.
 *
 * Skill fit dominates and rewards two-way swaps: half of it is "they can
 * teach what I want", half is "I can teach what they want". The remaining
 * weight goes to shared weekly availability, overlapping categories (a softer
 * signal than an exact skill match), reputation and experience.
 */
export function computeMatchScore(
  me: Pick<MatchCandidate, 'offered' | 'wanted' | 'availability'>,
  other: MatchCandidate,
  maxCompletedSessions: number,
): MatchScore {
  const myOffered = new Set(me.offered.map((skill) => key(skill.name)));
  const myWanted = new Set(me.wanted.map((skill) => key(skill.name)));

  const wantedByMe = other.offered.filter((skill) =>
    myWanted.has(key(skill.name)),
  );
  const offeredByMe = other.wanted.filter((skill) =>
    myOffered.has(key(skill.name)),
  );

  const skill =
    (ratio(wantedByMe.length, myWanted.size) +
      ratio(offeredByMe.length, myOffered.size)) /
    2;

  const theirSlots = new Set(other.availability);
  const sharedAvailability = me.availability.filter((slot) =>
    theirSlots.has(slot),
  );
  const availability = ratio(
    sharedAvailability.length,
    Math.min(me.availability.length, other.availability.length),
  );

  const myOfferedCategories = new Set(me.offered.map((s) => s.category));
  const myWantedCategories = new Set(me.wanted.map((s) => s.category));
  const theirOfferedCategories = new Set(other.offered.map((s) => s.category));
  const theirWantedCategories = new Set(other.wanted.map((s) => s.category));
  const categoryHits =
    [...myWantedCategories].filter((c) => theirOfferedCategories.has(c))
      .length +
    [...myOfferedCategories].filter((c) => theirWantedCategories.has(c)).length;
  const category = ratio(
    categoryHits,
    myWantedCategories.size + myOfferedCategories.size,
  );

  const rating = other.reviewCount > 0 ? ratio(other.ratingAvg ?? 0, 5) : 0;
  const experience = ratio(other.completedSessions, maxCompletedSessions);

  const score =
    skill * MATCH_WEIGHTS.skill +
    availability * MATCH_WEIGHTS.availability +
    category * MATCH_WEIGHTS.category +
    rating * MATCH_WEIGHTS.rating +
    experience * MATCH_WEIGHTS.experience;

  return {
    score,
    matchPercent: Math.round(score * 100),
    breakdown: { skill, availability, category, rating, experience },
    wantedByMe,
    offeredByMe,
    sharedAvailability,
  };
}
