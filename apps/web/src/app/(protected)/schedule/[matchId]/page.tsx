'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageTransition } from '@/components/PageTransition';
import toast from 'react-hot-toast';

function roundUpToNearestMinutes(minutes: number) {
  const date = new Date();
  date.setSeconds(0, 0);
  const remainder = minutes - (date.getMinutes() % minutes);
  date.setMinutes(date.getMinutes() + remainder);
  return date;
}

export default function ScheduleMatchPage({ params }: { params: { matchId: string } }) {
  const { matchId } = params;
  const [dateTime, setDateTime] = useState(() => roundUpToNearestMinutes(30).toISOString().slice(0, 16));
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [calendarUrl, setCalendarUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data as { name: string; email: string; hasGoogleCalendar: boolean };
    },
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const utcDate = new Date(dateTime);
      const payload = {
        matchId,
        scheduledAt: utcDate.toISOString(),
        durationMinutes,
      };
      const res = await api.post('/sessions', payload);
      return res.data as {
        meetingLink?: string;
        googleHtmlLink?: string;
        scheduledAt: string;
        durationMinutes: number;
      };
    },
    onSuccess: (data) => {
      setConfirmation(`Session scheduled for ${new Date(data.scheduledAt).toLocaleString()}.`);
      setCalendarUrl(data.googleHtmlLink ?? data.meetingLink ?? null);
      setStatusMessage('Session confirmed! View the calendar event below.');
      toast.success('Session scheduled!');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? 'Unable to create session.';
      setStatusMessage(msg);
      toast.error(msg);
    },
  });

  const ready = Boolean(user && !userLoading);
  const needsCalendar = Boolean(user && !user.hasGoogleCalendar);
  const mutationLoading = mutation.status === 'pending';
  const confirmDisabled = !ready || needsCalendar || mutationLoading;

  const durationOptions = useMemo(
    () => [30, 45, 60, 90, 120],
    [],
  );

  const connectCalendar = () => {
    window.location.assign('http://localhost:3001/calendar/connect');
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-background px-6 py-8 text-white">
        <div className="mx-auto max-w-5xl glass-card rounded-3xl p-6 shadow-lg">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-purple-300">Schedule Session</p>
              <h1 className="text-3xl font-bold text-white">Confirm your SkillSwap session</h1>
              <p className="mt-2 text-sm text-slate-400">Set a time, choose a duration, and Sync it with Google Calendar.</p>
            </div>
            <nav className="flex flex-wrap gap-3">
              <Link
                href="/matches"
                aria-label="Back to matches"
                className="rounded-2xl bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
              >
                Back to Matches
              </Link>
              <Link
                href="/sessions"
                aria-label="View my sessions"
                className="rounded-2xl bg-purple-700 px-4 py-2 text-sm text-white hover:bg-purple-600"
              >
                My Sessions
              </Link>
            </nav>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="glass-card rounded-3xl p-6" aria-label="Session scheduling form">
              {statusMessage ? (
                <div className="mb-6 glass rounded-3xl p-4 text-sm text-emerald-200" role="status">
                  {statusMessage}
                </div>
              ) : null}

              <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
                <div>
                  <Label htmlFor="dateTime">Meeting Date & Time</Label>
                  <Input
                    id="dateTime"
                    type="datetime-local"
                    value={dateTime}
                    onChange={(event) => setDateTime(event.target.value)}
                    aria-label="Meeting date and time"
                    className="mt-2 glass text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="duration">Duration</Label>
                  <select
                    id="duration"
                    value={durationMinutes}
                    onChange={(event) => setDurationMinutes(Number(event.target.value))}
                    aria-label="Session duration"
                    className="mt-2 w-full rounded-2xl border border-slate-700 glass px-4 py-3 text-white outline-none"
                  >
                    {durationOptions.map((value) => (
                      <option key={value} value={value}>{`${value} minutes`}</option>
                    ))}
                  </select>
                </div>

                <div className="glass rounded-3xl p-4 text-sm text-slate-300">
                  <p className="font-medium text-white">Timezone</p>
                  <p className="mt-1 text-slate-400">Times are stored in UTC and will be converted for your matched participant.</p>
                </div>

                {needsCalendar ? (
                  <div className="rounded-3xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-100" role="alert">
                    <p className="font-semibold text-amber-200">Google Calendar required</p>
                    <p className="mt-2 text-amber-300">Connect your calendar to create the event and generate a Meet link.</p>
                    <Button
                      onClick={connectCalendar}
                      aria-label="Connect Google Calendar"
                      className="mt-4 bg-amber-600 text-white hover:bg-amber-500"
                    >
                      Connect Google Calendar
                    </Button>
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    type="submit"
                    disabled={confirmDisabled}
                    aria-label="Confirm session"
                    className="min-h-[54px] bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    {mutationLoading ? 'Scheduling...' : 'Confirm Session'}
                  </Button>
                  <div className="text-sm text-slate-400">Your event will be created with reminders and a Google Meet link.</div>
                </div>

                {confirmation ? (
                  <div className="glass rounded-3xl p-4 text-sm text-slate-200" role="status">
                    <p>{confirmation}</p>
                    {calendarUrl ? (
                      <a
                        href={calendarUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="View in calendar"
                        className="mt-3 inline-flex rounded-full bg-purple-700 px-4 py-2 text-sm text-white hover:bg-purple-600"
                      >
                        View in Calendar
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </form>
            </section>

            <aside className="glass-card rounded-3xl p-6 space-y-4" aria-label="Session details sidebar">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-white">Ready to schedule</h2>
                <p className="text-sm text-slate-400">Choose a time that works for both you and your match.</p>
              </div>
              <div className="glass rounded-3xl p-4 text-sm text-slate-300">
                <p className="font-semibold text-white">Match ID</p>
                <p className="mt-2 break-all text-slate-400">{matchId}</p>
              </div>
              <div className="glass rounded-3xl p-4 text-sm text-slate-300">
                <p className="font-semibold text-white">Google status</p>
                {userLoading ? (
                  <div className="mt-2 space-y-2">
                    <div className="skeleton h-4 w-24 rounded" />
                  </div>
                ) : (
                  <p className="mt-2 text-slate-400">{user?.hasGoogleCalendar ? 'Connected' : 'Not connected'}</p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
