'use client';

import { use, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, CheckCircle2, Coins } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, apiBaseURL } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { formatDateTime, googleCalendarLink } from '@/lib/format';
import { useMe } from '@/lib/hooks';
import type { MatchDetail, Session } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DURATION_OPTIONS = [30, 45, 60, 90, 120];
// Mirrors lessonCost() in apps/api/src/credits/credits.rules.ts. The API is
// the authority; this only previews the price before booking.
const MINUTES_PER_CREDIT = 15;
const lessonCost = (minutes: number) => Math.max(1, Math.round(minutes / MINUTES_PER_CREDIT));

type SessionKind = 'SWAP' | 'LESSON';

/** Tomorrow at 6 pm local time, formatted for <input type="datetime-local">. */
function defaultDateTime() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(18, 0, 0, 0);
  return toDateTimeLocalValue(date);
}

function toDateTimeLocalValue(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

export default function ScheduleMatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params);
  const queryClient = useQueryClient();
  const [dateTime, setDateTime] = useState(defaultDateTime);
  const [minDateTime] = useState(() => toDateTimeLocalValue(new Date()));
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [kind, setKind] = useState<SessionKind>('SWAP');
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState<Session | null>(null);

  const { data: user } = useMe();
  const matchQuery = useQuery({
    queryKey: ['match', matchId],
    queryFn: async () => (await api.get<MatchDetail>(`/matches/${matchId}`)).data,
    retry: false,
  });
  const match = matchQuery.data;

  const mutation = useMutation({
    mutationFn: async () => {
      const start = new Date(dateTime);
      if (Number.isNaN(start.getTime())) {
        throw new Error('Pick a date and time for the session.');
      }
      if (start.getTime() <= Date.now()) {
        throw new Error('Pick a time in the future.');
      }
      const res = await api.post<Session>('/sessions', {
        matchId,
        scheduledAt: start.toISOString(),
        durationMinutes,
        kind,
        topic,
        notes,
      });
      return res.data;
    },
    onSuccess: (session) => {
      setScheduled(session);
      setFormError(null);
      for (const key of ['sessions', 'overview', 'connections', 'me', 'credits']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      toast.success('Session scheduled!');
    },
    onError: (error: unknown) => {
      const fallback = 'Unable to schedule the session.';
      const message = axios.isAxiosError(error)
        ? getApiErrorMessage(error, fallback)
        : error instanceof Error
          ? error.message
          : fallback;
      setFormError(message);
      toast.error(message);
    },
  });

  if (matchQuery.isLoading) {
    return (
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-3xl space-y-4" role="status" aria-label="Loading">
          <div className="skeleton h-10 w-72" />
          <div className="skeleton h-96 rounded-3xl" />
        </div>
      </main>
    );
  }

  if (matchQuery.isError || !match) {
    return (
      <PageTransition>
        <main className="px-4 py-6 sm:px-6 sm:py-8">
          <section className="mx-auto max-w-3xl glass-card rounded-3xl p-10 text-center" role="alert">
            <p className="text-lg font-semibold text-white">Connection not found</p>
            <p className="mt-2 text-sm text-slate-400">You can only schedule sessions with your connections.</p>
            <Link
              href="/matches?tab=connections"
              className="mt-6 inline-flex rounded-xl bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600"
            >
              View connections
            </Link>
          </section>
        </main>
      </PageTransition>
    );
  }

  const partner = match.partner;
  const partnerFirstName = partner.name.split(' ')[0];
  const notConnected = match.status !== 'ACCEPTED';
  const cost = lessonCost(durationMinutes);
  const balance = user?.credits ?? 0;
  const cannotAfford = kind === 'LESSON' && balance < cost;

  return (
    <PageTransition>
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <header className="flex items-center gap-4">
            <Avatar name={partner.name} src={partner.avatarUrl} size="lg" />
            <div className="min-w-0">
              <p className="text-sm uppercase tracking-[0.3em] text-purple-300">Schedule session</p>
              <h1 className="truncate text-2xl font-bold text-white sm:text-3xl">Session with {partner.name}</h1>
            </div>
          </header>

          {scheduled ? (
            <section className="glass-card rounded-3xl p-8 text-center" role="status">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-semibold text-white">You&apos;re booked</h2>
              <p className="mt-2 text-sm text-slate-300">
                {scheduled.topic ?? 'SkillSwap session'} with {partner.name} on{' '}
                {formatDateTime(scheduled.scheduledAt)} for {scheduled.durationMinutes} minutes.
              </p>
              {scheduled.creditCost > 0 ? (
                <p className="mt-2 text-sm text-amber-200">
                  {scheduled.creditCost} credit{scheduled.creditCost === 1 ? '' : 's'} held. {partnerFirstName} receives
                  them when you confirm the lesson; you get them back if it is cancelled.
                </p>
              ) : null}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href={`/sessions/${scheduled.id}`}
                  className="inline-flex rounded-xl bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600"
                >
                  View session
                </Link>
                <a
                  href={
                    scheduled.googleHtmlLink ??
                    googleCalendarLink({
                      title: `SkillSwap: ${scheduled.topic ?? 'session'} with ${partner.name}`,
                      start: scheduled.scheduledAt,
                      durationMinutes: scheduled.durationMinutes,
                      details: scheduled.notes ?? undefined,
                      location: scheduled.meetingLink,
                    })
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                >
                  <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                  {scheduled.googleHtmlLink ? 'Open calendar event' : 'Add to Google Calendar'}
                </a>
                <button
                  type="button"
                  onClick={() => setScheduled(null)}
                  className="inline-flex rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                >
                  Schedule another
                </button>
              </div>
            </section>
          ) : notConnected ? (
            <section className="glass-card rounded-3xl p-8 text-center">
              <p className="text-lg font-semibold text-white">You&apos;re not connected yet</p>
              <p className="mt-2 text-sm text-slate-400">
                Sessions can be scheduled once the connection request is accepted.
              </p>
              <Link
                href="/matches?tab=requests"
                className="mt-6 inline-flex rounded-xl bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600"
              >
                View requests
              </Link>
            </section>
          ) : (
            <form
              className="glass-card space-y-6 rounded-3xl p-6"
              onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate();
              }}
            >
              <fieldset>
                <legend className="text-sm font-medium text-white">What kind of session?</legend>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      {
                        value: 'SWAP',
                        title: 'Skill swap',
                        detail: 'You teach each other. No credits change hands.',
                      },
                      {
                        value: 'LESSON',
                        title: `Lesson from ${partnerFirstName}`,
                        detail: `${partnerFirstName} teaches you. Costs ${cost} credit${cost === 1 ? '' : 's'}.`,
                      },
                    ] as const
                  ).map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        'cursor-pointer rounded-2xl border p-4 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-purple-500',
                        kind === option.value
                          ? 'border-purple-500 bg-purple-900/40'
                          : 'border-white/10 bg-white/[0.03] hover:border-purple-500/60',
                      )}
                    >
                      <input
                        type="radio"
                        name="kind"
                        value={option.value}
                        checked={kind === option.value}
                        onChange={() => setKind(option.value)}
                        className="sr-only"
                      />
                      <span className="block text-sm font-semibold text-white">{option.title}</span>
                      <span className="mt-1 block text-xs text-slate-400">{option.detail}</span>
                    </label>
                  ))}
                </div>
                {kind === 'LESSON' ? (
                  <p
                    className={cn(
                      'mt-3 flex items-center gap-2 text-sm',
                      cannotAfford ? 'text-rose-300' : 'text-amber-200',
                    )}
                    role={cannotAfford ? 'alert' : undefined}
                  >
                    <Coins className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {cannotAfford
                      ? `This lesson costs ${cost} credits and you have ${balance}. Pick a shorter lesson, or teach to earn more.`
                      : `You have ${balance} credits. ${cost} will be held until you confirm the lesson happened.`}
                  </p>
                ) : null}
              </fieldset>

              <div>
                <Label htmlFor="topic">What will you work on?</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  maxLength={120}
                  placeholder="e.g. Guitar basics"
                  className="mt-2 h-11 rounded-2xl text-white"
                />
                {match.swappableSkills.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Suggested topics">
                    {match.swappableSkills.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => setTopic(skill)}
                        aria-pressed={topic === skill}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-medium transition',
                          topic === skill
                            ? 'border-purple-500 bg-purple-900/80 text-white'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:border-purple-500/60',
                        )}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="dateTime">Date and time</Label>
                  <Input
                    id="dateTime"
                    type="datetime-local"
                    required
                    min={minDateTime}
                    value={dateTime}
                    onChange={(event) => setDateTime(event.target.value)}
                    className="mt-2 h-11 rounded-2xl text-white [color-scheme:dark]"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    In your local time. {partner.name.split(' ')[0]} sees it in theirs.
                  </p>
                </div>
                <div>
                  <Label htmlFor="duration">Duration</Label>
                  <select
                    id="duration"
                    value={durationMinutes}
                    onChange={(event) => setDurationMinutes(Number(event.target.value))}
                    className="mt-2 h-11 w-full rounded-2xl border border-input bg-input/30 px-3 text-sm text-white outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [color-scheme:dark]"
                  >
                    {DURATION_OPTIONS.map((value) => (
                      <option key={value} value={value}>{`${value} minutes`}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes for {partner.name.split(' ')[0]} (optional)</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Anything to prepare or bring?"
                  className="mt-2 w-full rounded-2xl border border-input bg-input/30 p-3 text-sm text-white outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>

              {user?.googleCalendarAvailable ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
                  {user.hasGoogleCalendar ? (
                    <p className="text-slate-300">
                      <span className="font-medium text-emerald-300">Google Calendar connected.</span> An event with
                      a Meet link will be added to your calendar and {partner.name.split(' ')[0]} will be invited.
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-slate-300">
                        Optional: connect Google Calendar to create the event and invite automatically.
                      </p>
                      <Button
                        type="button"
                        onClick={() => window.location.assign(`${apiBaseURL}/calendar/connect`)}
                        className="bg-white/10 text-white hover:bg-white/20"
                      >
                        Connect Google Calendar
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}

              {formError ? (
                <p className="text-sm text-rose-300" role="alert">
                  {formError}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  disabled={mutation.isPending || cannotAfford}
                  className="h-11 rounded-2xl bg-emerald-600 px-6 text-white hover:bg-emerald-500"
                >
                  {mutation.isPending
                    ? 'Scheduling…'
                    : kind === 'LESSON'
                      ? `Book for ${cost} credit${cost === 1 ? '' : 's'}`
                      : 'Confirm session'}
                </Button>
                <Link
                  href={`/chat/${matchId}`}
                  className="inline-flex h-11 items-center rounded-2xl bg-white/5 px-4 text-sm font-medium text-white hover:bg-white/10"
                >
                  Back to chat
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
