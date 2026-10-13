// Mirrors apps/api/src/users/availability.ts.
export const AVAILABILITY_DAYS = [
  { key: 'MON', label: 'Mon' },
  { key: 'TUE', label: 'Tue' },
  { key: 'WED', label: 'Wed' },
  { key: 'THU', label: 'Thu' },
  { key: 'FRI', label: 'Fri' },
  { key: 'SAT', label: 'Sat' },
  { key: 'SUN', label: 'Sun' },
] as const;

export const AVAILABILITY_PERIODS = [
  { key: 'MORNING', label: 'Morning' },
  { key: 'AFTERNOON', label: 'Afternoon' },
  { key: 'EVENING', label: 'Evening' },
] as const;

export const slotKey = (day: string, period: string) => `${day}_${period}`;

/** "MON_EVENING" -> "Mon evening" */
export function formatSlot(slot: string) {
  const [day, period] = slot.split('_');
  const dayLabel = AVAILABILITY_DAYS.find((d) => d.key === day)?.label ?? day;
  return `${dayLabel} ${period?.toLowerCase() ?? ''}`.trim();
}
