'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Star, Award, Trophy, ArrowLeft, Calendar } from 'lucide-react';
import PageTransition from '@/components/PageTransition';

interface LeaderboardUser {
  id: string;
  name: string;
  avatarUrl?: string;
  ratingAvg: number;
  badgeCount: number;
  completedSessions: number;
}

function LeaderboardSkeleton() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <caption className="sr-only">Loading leaderboard...</caption>
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-900/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-4 px-6 text-center w-20">Rank</th>
              <th className="py-4 px-6">User</th>
              <th className="py-4 px-6 text-center">Sessions</th>
              <th className="py-4 px-6 text-center">Badges</th>
              <th className="py-4 px-6 text-center">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="hover:bg-slate-900/30 transition-colors">
                <td className="py-5 px-6 text-center">
                  <div className="skeleton h-8 w-8 rounded-full mx-auto" />
                </td>
                <td className="py-5 px-6">
                  <div className="flex items-center gap-3">
                    <div className="skeleton h-10 w-10 rounded-2xl" />
                    <div className="skeleton h-5 w-32" />
                  </div>
                </td>
                <td className="py-5 px-6 text-center">
                  <div className="skeleton h-7 w-16 rounded-full mx-auto" />
                </td>
                <td className="py-5 px-6 text-center">
                  <div className="skeleton h-7 w-16 rounded-full mx-auto" />
                </td>
                <td className="py-5 px-6 text-center">
                  <div className="skeleton h-5 w-12 mx-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const res = await api.get('/leaderboard');
      return res.data as LeaderboardUser[];
    },
  });

  return (
    <PageTransition>
      <main className="min-h-screen bg-background px-6 py-8 text-white">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-purple-400">
                <Trophy className="h-5 w-5" />
                <p className="text-sm uppercase tracking-[0.3em] font-medium">Leaderboard</p>
              </div>
              <h1 className="text-4xl font-bold text-white mt-1">Top Mentors & Swappers</h1>
              <p className="mt-2 text-sm text-slate-400">
                Ranking our active community members by completed sessions and ratings.
              </p>
            </div>
            <Link href="/dashboard" aria-label="Back to Dashboard">
              <Button variant="secondary" className="bg-white/5 text-white hover:bg-white/10 flex items-center gap-2" aria-label="Back to Dashboard">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Button>
            </Link>
          </div>

          {/* Leaderboard standings */}
          {isLoading ? (
            <LeaderboardSkeleton />
          ) : isError ? (
            <section className="glass-card p-12 text-center text-rose-200 bg-rose-950/30">
              Failed to load leaderboard data. Please try again.
            </section>
          ) : data?.length === 0 ? (
            <section className="glass-card p-12 text-center text-slate-400">
              No rankings yet. Start swapping skills and complete sessions to rank!
            </section>
          ) : (
            <section className="glass-card overflow-hidden" aria-label="Leaderboard rankings">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" aria-label="Leaderboard standings table">
                  <caption className="text-sm text-slate-400 p-4 text-center">
                    Top community members ranked by sessions, badges, and average rating
                  </caption>
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-slate-900/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-6 text-center w-20">Rank</th>
                      <th className="py-4 px-6">User</th>
                      <th className="py-4 px-6 text-center">Sessions</th>
                      <th className="py-4 px-6 text-center">Badges</th>
                      <th className="py-4 px-6 text-center">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {data!.map((user, index) => {
                      const rank = index + 1;
                      const isTopThree = rank <= 3;
                      const rankColor =
                        rank === 1
                          ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                          : rank === 2
                          ? 'text-slate-300 bg-slate-300/10 border-slate-300/20'
                          : 'text-amber-600 bg-amber-700/10 border-amber-700/20';

                      return (
                        <tr key={user.id} className="hover:bg-slate-900/30 transition-colors">
                          {/* Rank */}
                          <td className="py-5 px-6 text-center font-bold">
                            {isTopThree ? (
                              <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full border ${rankColor}`}>
                                {rank}
                              </span>
                            ) : (
                              <span className="text-slate-400">{rank}</span>
                            )}
                          </td>

                          {/* User Details */}
                          <td className="py-5 px-6">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-purple-900/80 text-white font-bold text-sm overflow-hidden shrink-0 border border-purple-500/20">
                                {user.avatarUrl ? (
                                  <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                                ) : (
                                  user.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <span className="font-semibold text-white text-base">{user.name}</span>
                            </div>
                          </td>

                          {/* Completed Sessions */}
                          <td className="py-5 px-6 text-center">
                            <div className="inline-flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-3 py-1 rounded-full text-sm">
                              <Calendar className="h-3.5 w-3.5 text-purple-400" />
                              <span className="font-medium">{user.completedSessions}</span>
                            </div>
                          </td>

                          {/* Badge Count */}
                          <td className="py-5 px-6 text-center">
                            <div className="inline-flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-3 py-1 rounded-full text-sm">
                              <Award className="h-3.5 w-3.5 text-purple-400" />
                              <span className="font-medium">{user.badgeCount}</span>
                            </div>
                          </td>

                          {/* Avg Rating */}
                          <td className="py-5 px-6 text-center">
                            <div className="inline-flex items-center gap-1 text-amber-400 font-semibold text-sm">
                              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                              <span>{user.ratingAvg.toFixed(1)}</span>
                            </div>
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
