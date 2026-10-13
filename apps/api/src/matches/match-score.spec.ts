import { computeMatchScore, MatchCandidate } from './match-score';

const skill = (name: string, category = 'Programming') => ({ name, category });

const candidate = (
  overrides: Partial<MatchCandidate> = {},
): MatchCandidate => ({
  offered: [],
  wanted: [],
  availability: [],
  ratingAvg: null,
  reviewCount: 0,
  completedSessions: 0,
  ...overrides,
});

describe('computeMatchScore', () => {
  const me = {
    offered: [skill('Python')],
    wanted: [skill('Guitar', 'Music')],
    availability: ['MON_EVENING', 'SAT_MORNING'],
  };

  it('gives a perfect score to an ideal two-way swap', () => {
    const result = computeMatchScore(
      me,
      candidate({
        offered: [skill('Guitar', 'Music')],
        wanted: [skill('Python')],
        availability: ['MON_EVENING', 'SAT_MORNING'],
        ratingAvg: 5,
        reviewCount: 4,
        completedSessions: 8,
      }),
      8,
    );

    expect(result.matchPercent).toBe(100);
    expect(result.wantedByMe.map((s) => s.name)).toEqual(['Guitar']);
    expect(result.offeredByMe.map((s) => s.name)).toEqual(['Python']);
    expect(result.sharedAvailability).toEqual(['MON_EVENING', 'SAT_MORNING']);
  });

  it('scores a one-way match below a two-way swap', () => {
    const oneWay = computeMatchScore(
      me,
      candidate({ offered: [skill('Guitar', 'Music')] }),
      1,
    );
    const twoWay = computeMatchScore(
      me,
      candidate({
        offered: [skill('Guitar', 'Music')],
        wanted: [skill('Python')],
      }),
      1,
    );

    expect(oneWay.breakdown.skill).toBe(0.5);
    expect(twoWay.breakdown.skill).toBe(1);
    expect(twoWay.score).toBeGreaterThan(oneWay.score);
  });

  it('matches skill names case-insensitively', () => {
    const result = computeMatchScore(
      me,
      candidate({ offered: [skill('  guitar ', 'Music')] }),
      1,
    );
    expect(result.wantedByMe).toHaveLength(1);
  });

  it('scores zero when nothing overlaps', () => {
    const result = computeMatchScore(
      me,
      candidate({
        offered: [skill('Cooking', 'Food')],
        wanted: [skill('Chess', 'Games')],
        availability: ['TUE_MORNING'],
      }),
      1,
    );
    expect(result.score).toBe(0);
    expect(result.matchPercent).toBe(0);
  });

  it('ignores the default rating of users with no reviews', () => {
    const unreviewed = computeMatchScore(
      me,
      candidate({ ratingAvg: 5, reviewCount: 0 }),
      1,
    );
    expect(unreviewed.breakdown.rating).toBe(0);
  });

  it('never exceeds 100% or divides by zero for empty profiles', () => {
    const result = computeMatchScore(
      { offered: [], wanted: [], availability: [] },
      candidate({ completedSessions: 3 }),
      0,
    );
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.matchPercent).toBe(0);
  });
});
