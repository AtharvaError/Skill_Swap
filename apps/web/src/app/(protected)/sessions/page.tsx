'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useNow } from '@/lib/hooks';
import type { Session } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import PageTransition, { FadeIn } from '@/components/PageTransition';

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: 'bg-emerald-950/60 text-emerald-300 ring-emerald-500/30',
  IN_PROGRESS: 'bg-amber-950/50 text-amber-200 ring-amber-500/30',
  COMPLETED: 'bg-purple-950/60 text-purple-200 ring-purple-500/30',
  CANCELLED: 'bg-slate-900/80 text-slate-400 ring-white/10',
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'Happening now',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

function SessionCard({ session, now }: { session: Session; now: number }) {
  const start = new Date(session.scheduledAt).getTime();
  const end = start + session.durationMinutes * 60000;
  const live = session.status === 'SCHEDULED' && now >= start && now < end;
  const overdue = session.status === 'SCHEDULED' && now >= end;
  const displayStatus = live ? 'IN_PROGRESS' : session.status;

  return (
    <FadeIn>
      <article className="glass-card rounded-3xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={session.partner.name} src={session.partner.avatarUrl} />
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-white">
                {session.topic ?? 'SkillSwap session'}
              </h3>
              <p className="truncate text-sm text-slate-400">
                with{' '}
                <Link href={`/users/${session.partner.id}`} className="text-slate-200 hover:underline">
                  {session.partner.name}
                </Link>
              </p>
            </div>
          </div>
          <span className={cn('rounded-full px-3 py-1 text-xs font-semibold ring-1', STATUS_STYLES[displayStatus])}>
            {STATUS_LABELS[displayStatus]}
          </span>
        </div>

        <p className="mt-3 text-sm text-slate-300">
          {formatDateTime(session.scheduledAt)} · {session.durationMinutes} minutes
          <span className="text-slate-500"> · </span>
          {session.role ? (
            <span className="text-amber-200">
              {session.role === 'teacher' ? 'You teach' : 'Lesson'} · {session.creditCost} credit
              {session.creditCost === 1 ? '' : 's'}
            </span>
          ) : (
            <span className="text-slate-400">Skill swap</span>
          )}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href={`/sessions/${session.id}`}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-medium text-white',
              live ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-purple-700 hover:bg-purple-600',
            )}
          >
            {live ? 'Join now' : 'View session'}
          </Link>
          {overdue ? (
            <span className="text-xs text-amber-200">
              {session.role === 'teacher'
                ? `Waiting for ${session.partner.name.split(' ')[0]} to confirm the lesson.`
                : 'Finished? Open it to mark it complete.'}
            </span>
          ) : session.status === 'COMPLETED' && !session.hasReviewed ? (
            <span className="text-xs text-amber-200">Leave a review for {session.partner.name.split(' ')[0]}</span>
          ) : null}
        </div>
      </article>
    </FadeIn>
  );
}

export default function MySessionsPage() {
  const now = useNow();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => (await api.get<Session[]>('/sessions')).data,
  });

  // The API returns newest first. Upcoming reads better soonest first.
  const upcoming = (data ?? [])
    .filter(
      (session) =>
        session.status === 'SCHEDULED' &&
        new Date(session.scheduledAt).getTime() + session.durationMinutes * 60000 > now,
    )
    .reverse();
  const upcomingIds = new Set(upcoming.map((session) => session.id));
  const past = (data ?? []).filter((session) => !upcomingIds.has(session.id));

  return (
    <PageTransition>
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-purple-300">Sessions</p>
              <h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl">Your sessions</h1>
            </div>
            <Link
              href="/matches?tab=connections"
              className="rounded-xl bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600"
            >
              Schedule a session
            </Link>
          </header>

          {isLoading ? (
            <div className="space-y-4" role="status" aria-label="Loading sessions">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-36 rounded-3xl" />
              ))}
            </div>
          ) : isError ? (
            <section className="glass-card rounded-3xl p-10 text-center text-rose-200" role="alert">
              Unable to load sessions. Please refresh the page.
            </section>
          ) : data?.length === 0 ? (
            <section className="glass-card rounded-3xl p-10 text-center">
              <p className="text-lg font-semibold text-white">No sessions yet</p>
              <p className="mt-2 text-sm text-slate-400">
                Pick one of your connections and agree on a time to swap skills.
              </p>
            </section>
          ) : (
            <>
              <section aria-labelledby="upcoming-heading" className="space-y-4">
                <h2 id="upcoming-heading" className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Upcoming
                </h2>
                {upcoming.length === 0 ? (
                  <p className="glass-card rounded-3xl p-6 text-sm text-slate-400">Nothing coming up.</p>
                ) : (
                  upcoming.map((session) => <SessionCard key={session.id} session={session} now={now} />)
                )}
              </section>

              {past.length > 0 ? (
                <section aria-labelledby="past-heading" className="space-y-4">
                  <h2 id="past-heading" className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Past
                  </h2>
                  {past.map((session) => (
                    <SessionCard key={session.id} session={session} now={now} />
                  ))}
                </section>
              ) : null}
            </>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
