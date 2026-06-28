'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import PageTransition, { FadeIn } from '@/components/PageTransition';

export default function MySessionsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await api.get('/sessions');
      return res.data as Array<{
        id: string;
        scheduledAt: string;
        durationMinutes: number;
        meetingLink?: string;
        googleHtmlLink?: string;
        status: string;
        match: {
          userA: { name: string };
          userB: { name: string };
        };
      }>;
    },
  });

  const now = new Date();

  return (
    <PageTransition>
      <main className="min-h-screen bg-background px-4 py-6 text-white sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-800 glass-card p-6 shadow-lg shadow-slate-900/20">
          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-purple-300">My Sessions</p>
              <h1 className="text-3xl font-bold text-white">Your upcoming and past SkillSwap sessions</h1>
            </div>
            <Link href="/matches" aria-label="Back to matches page" className="rounded-2xl bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">Back to Matches</Link>
          </header>

          {isLoading ? (
            <section className="space-y-4" aria-label="Loading sessions">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-3xl border border-slate-800 glass p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2 flex-1">
                      <div className="skeleton h-4 w-24 rounded" />
                      <div className="skeleton h-6 w-48 rounded" />
                    </div>
                    <div className="skeleton h-6 w-20 rounded-full" />
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <div className="skeleton h-3 w-10 rounded" />
                      <div className="skeleton h-4 w-36 rounded" />
                    </div>
                    <div className="space-y-1">
                      <div className="skeleton h-3 w-14 rounded" />
                      <div className="skeleton h-4 w-20 rounded" />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <div className="skeleton h-9 w-28 rounded-2xl" />
                    <div className="skeleton h-9 w-28 rounded-2xl" />
                  </div>
                </div>
              ))}
            </section>
          ) : isError ? (
            <section className="rounded-3xl border border-slate-800 bg-rose-950/70 p-8 text-center text-rose-200" role="alert">
              <p>Unable to load sessions.</p>
            </section>
          ) : data?.length === 0 ? (
            <section className="rounded-3xl border border-slate-800 glass p-8 text-center text-slate-400">
              <p>No sessions yet. Schedule one from a match page.</p>
            </section>
          ) : (
            <section className="space-y-4" aria-label="Session list">
              {data!.map((session) => {
                const participants = `${session.match.userA.name} & ${session.match.userB.name}`;
                const startDate = new Date(session.scheduledAt);
                const isPast = startDate < now;
                return (
                  <FadeIn key={session.id}>
                    <article className="rounded-3xl border border-slate-800 glass p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Session participants</p>
                          <h2 className="text-xl font-semibold text-white">{participants}</h2>
                        </div>
                        <div className="rounded-full px-3 py-1 text-sm font-semibold text-white" style={{ backgroundColor: isPast ? '#7c3aed' : '#16a34a' }} aria-label={`Session status: ${session.status}`}>
                          {session.status}
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-sm text-slate-400">When</p>
                          <p className="text-white">{startDate.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-400">Duration</p>
                          <p className="text-white">{session.durationMinutes} minutes</p>
                        </div>
                      </div>
                      <nav className="mt-4 flex flex-wrap gap-3" aria-label="Session actions">
                        <Link href={`/sessions/${session.id}`} aria-label={`View session with ${participants}`} className="rounded-2xl bg-purple-700 px-4 py-2 text-sm text-white hover:bg-purple-600">
                          View Session
                        </Link>
                        {session.meetingLink ? (
                          <a href={session.meetingLink} target="_blank" rel="noreferrer" aria-label="Join video meeting" className="rounded-2xl bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">Join Meeting</a>
                        ) : null}
                        {session.googleHtmlLink ? (
                          <a href={session.googleHtmlLink} target="_blank" rel="noreferrer" aria-label="View Google Calendar event" className="rounded-2xl bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">View Event</a>
                        ) : null}
                      </nav>
                    </article>
                  </FadeIn>
                );
              })}
            </section>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
