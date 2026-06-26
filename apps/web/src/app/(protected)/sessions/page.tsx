'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

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
    <div className="min-h-screen bg-[#111018] px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-lg shadow-slate-900/20">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-purple-300">My Sessions</p>
            <h1 className="text-3xl font-bold text-white">Your upcoming and past SkillSwap sessions</h1>
          </div>
          <Link href="/matches" className="rounded-2xl bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">Back to Matches</Link>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-400">Loading sessions...</div>
        ) : isError ? (
          <div className="rounded-3xl border border-slate-800 bg-rose-950/70 p-8 text-center text-rose-200">Unable to load sessions.</div>
        ) : data?.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-400">No sessions yet. Schedule one from a match page.</div>
        ) : (
          <div className="space-y-4">
            {data!.map((session) => {
              const participants = `${session.match.userA.name} & ${session.match.userB.name}`;
              const startDate = new Date(session.scheduledAt);
              const isPast = startDate < now;
              return (
                <div key={session.id} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Session participants</p>
                      <h2 className="text-xl font-semibold text-white">{participants}</h2>
                    </div>
                    <div className="rounded-full px-3 py-1 text-sm font-semibold text-white" style={{ backgroundColor: isPast ? '#7c3aed' : '#16a34a' }}>
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
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href={`/sessions/${session.id}`} className="rounded-2xl bg-purple-700 px-4 py-2 text-sm text-white hover:bg-purple-600">
                      View Session
                    </Link>
                    {session.meetingLink ? (
                      <a href={session.meetingLink} target="_blank" rel="noreferrer" className="rounded-2xl bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">Join Meeting</a>
                    ) : null}
                    {session.googleHtmlLink ? (
                      <a href={session.googleHtmlLink} target="_blank" rel="noreferrer" className="rounded-2xl bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">View Event</a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
