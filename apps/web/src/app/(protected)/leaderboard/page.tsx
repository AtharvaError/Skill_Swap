'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Award, Calendar, Star, Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { useMe } from '@/lib/hooks';
import type { LeaderboardUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import PageTransition from '@/components/PageTransition';

const RANK_STYLES: Record<number, string> = {
  1: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  2: 'text-slate-300 bg-slate-300/10 border-slate-300/20',
  3: 'text-amber-600 bg-amber-700/10 border-amber-700/20',
};

function LeaderboardSkeleton() {
  return (
    <div className="glass-card space-y-3 rounded-3xl p-6" role="status" aria-label="Loading leaderboard">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="skeleton h-8 w-8 rounded-full" />
          <div className="skeleton h-10 w-10 rounded-2xl" />
          <div className="skeleton h-5 flex-1" />
          <div className="skeleton h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

export default function LeaderboardPage() {
  const { data: me } = useMe();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => (await api.get<LeaderboardUser[]>('/leaderboard')).data,
  });

  return (
    <PageTransition>
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <header>
            <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.3em] text-purple-300">
              <Trophy className="h-4 w-4" aria-hidden="true" />
              Leaderboard
            </p>
            <h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl">Top mentors and swappers</h1>
            <p className="mt-2 text-sm text-slate-400">
              Ranked by completed sessions, then by average rating.
            </p>
          </header>

          {isLoading ? (
            <LeaderboardSkeleton />
          ) : isError ? (
            <section className="glass-card rounded-3xl p-10 text-center text-rose-200" role="alert">
              Failed to load the leaderboard. Please try again.
            </section>
          ) : !data || data.length === 0 ? (
            <section className="glass-card rounded-3xl p-10 text-center text-slate-400">
              No rankings yet. Complete a session to get on the board.
            </section>
          ) : (
            <section className="glass-card overflow-hidden rounded-3xl" aria-label="Leaderboard rankings">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <caption className="sr-only">
                    Community members ranked by completed sessions and average rating
                  </caption>
                  <thead>
                    <tr className="border-b border-white/[0.06] text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <th scope="col" className="w-16 px-4 py-4 text-center">
                        Rank
                      </th>
                      <th scope="col" className="px-4 py-4">
                        Member
                      </th>
                      <th scope="col" className="px-4 py-4 text-center">
                        Sessions
                      </th>
                      <th scope="col" className="px-4 py-4 text-center">
                        Badges
                      </th>
                      <th scope="col" className="px-4 py-4 text-center">
                        Rating
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {data.map((user, index) => {
                      const rank = index + 1;
                      const isMe = user.id === me?.id;
                      return (
                        <tr key={user.id} className={cn('transition-colors', isMe ? 'bg-purple-900/20' : 'hover:bg-white/[0.03]')}>
                          <td className="px-4 py-4 text-center font-bold">
                            {RANK_STYLES[rank] ? (
                              <span
                                className={cn(
                                  'inline-flex h-8 w-8 items-center justify-center rounded-full border',
                                  RANK_STYLES[rank],
                                )}
                              >
                                {rank}
                              </span>
                            ) : (
                              <span className="text-slate-400">{rank}</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <Link href={`/users/${user.id}`} className="group flex items-center gap-3">
                              <Avatar name={user.name} src={user.avatarUrl} />
                              <span className="min-w-0">
                                <span className="block truncate font-semibold text-white group-hover:underline">
                                  {user.name}
                                  {isMe ? (
                                    <span className="ml-2 rounded-full bg-purple-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                      You
                                    </span>
                                  ) : null}
                                </span>
                                {user.college ? (
                                  <span className="block truncate text-xs text-slate-500">{user.college}</span>
                                ) : null}
                              </span>
                            </Link>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-300">
                              <Calendar className="h-3.5 w-3.5 text-purple-400" aria-hidden="true" />
                              {user.completedSessions}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-300">
                              <Award className="h-3.5 w-3.5 text-purple-400" aria-hidden="true" />
                              {user.badgeCount}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {user.reviewCount > 0 ? (
                              <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-400">
                                <Star className="h-4 w-4 fill-amber-400" aria-hidden="true" />
                                {user.ratingAvg.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-sm text-slate-600" aria-label="No reviews yet">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
