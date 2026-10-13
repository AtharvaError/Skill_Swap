export function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatTime(value: string | Date) {
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** "just now", "5m ago", "3h ago", "2d ago", then a date. */
export function formatRelative(value: string | Date, now: number) {
  const then = new Date(value).getTime();
  const minutes = Math.floor((now - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const pad = (n: number) => String(n).padStart(2, '0');
const toCalendarStamp = (date: Date) =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
  `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`;

/**
 * A prefilled "add event" link for Google Calendar. Works for anyone, with no
 * OAuth connection, so it is offered even when the server-side integration
 * is not configured.
 */
export function googleCalendarLink(event: {
  title: string;
  start: string | Date;
  durationMinutes: number;
  details?: string;
  location?: string | null;
}) {
  const start = new Date(event.start);
  const end = new Date(start.getTime() + event.durationMinutes * 60000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toCalendarStamp(start)}/${toCalendarStamp(end)}`,
  });
  if (event.details) params.set('details', event.details);
  if (event.location) params.set('location', event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
