export const AVAILABILITY_DAYS = [
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
  'SUN',
] as const;

export const AVAILABILITY_PERIODS = [
  'MORNING',
  'AFTERNOON',
  'EVENING',
] as const;

/** Every valid weekly slot, e.g. "MON_MORNING". */
export const AVAILABILITY_SLOTS: string[] = AVAILABILITY_DAYS.flatMap((day) =>
  AVAILABILITY_PERIODS.map((period) => `${day}_${period}`),
);
