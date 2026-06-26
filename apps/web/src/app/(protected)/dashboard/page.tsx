'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Trophy, Award, Star, Calendar, Users, ArrowRight, User } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import toast from 'react-hot-toast';

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-10 w-72" />
          <div className="skeleton h-4 w-56" />
        </div>
        <div className="skeleton h-11 w-36 rounded-2xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-5 flex items-center gap-4">
            <div className="skeleton h-12 w-12 rounded-2xl" />
            <div className="space-y-2 flex-1">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-6 w-16" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-6">
            <div className="space-y-2">
              <div className="skeleton h-6 w-40" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/4" />
            </div>
            <div className="mt-6 flex items-center justify-between">
              <div className="skeleton h-3 w-28" />
              <div className="skeleton h-11 w-32 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data;
    },
  });

  useEffect(() => {
    if (user?.name) {
      toast.success(`Welcome back, ${user.name}!`);
    }
  }, [user?.name]);

  const ratingAvg = user?.ratingAvg ?? 0;
  const badgeCount = user?.badges?.length ?? 0;

  return (
    <PageTransition>
      <main className="min-h-screen bg-background px-6 py-8 text-white">
        <div className="mx-auto max-w-5xl">
          {isLoading ? (
            <DashboardSkeleton />
          ) : (
            <div className="space-y-8">
              {/* Header */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-purple-300">Workspace</p>
                  <h1 className="text-4xl font-bold text-white mt-1">SkillSwap Dashboard</h1>
                  <p className="mt-2 text-sm text-slate-400">
                    Welcome back, <span className="text-purple-300 font-semibold">{user?.name}</span>! Ready to swap skills?
                  </p>
                </div>
                <Link href="/profile" aria-label="View your profile">
                  <Button className="bg-purple-700 text-white hover:bg-purple-600 flex items-center gap-2 rounded-2xl" aria-label="View Profile">
                    <User className="h-4 w-4" />
                    <span>View Profile</span>
                  </Button>
                </Link>
              </div>

              {/* Stats Grid */}
              <section aria-label="Your statistics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="glass-card p-5 flex items-center gap-4">
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Star className="h-5 w-5 fill-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Average Rating</p>
                    <p className="text-xl font-bold mt-1 text-white">{ratingAvg.toFixed(1)} / 5.0</p>
                  </div>
                </div>

                <div className="glass-card p-5 flex items-center gap-4">
                  <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Badges Earned</p>
                    <p className="text-xl font-bold mt-1 text-white">{badgeCount}</p>
                  </div>
                </div>

                <div className="glass-card p-5 flex items-center gap-4">
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Matches</p>
                    <p className="text-xl font-bold mt-1 text-white">{user?.matchCount ?? 'Find Connections'}</p>
                  </div>
                </div>

                <div className="glass-card p-5 flex items-center gap-4">
                  <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Sessions</p>
                    <p className="text-xl font-bold mt-1 text-white">Scheduled Chats</p>
                  </div>
                </div>
              </section>

              {/* Action Cards */}
              <section aria-label="Quick actions" className="grid gap-6 md:grid-cols-2">
                <div className="glass-card p-6 flex flex-col justify-between hover:border-slate-700 transition duration-300">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-emerald-400" />
                      <span>Skill Matches</span>
                    </h2>
                    <p className="text-sm text-slate-400 mt-2">
                      Connect with users matching your offered or desired learning skills. Trade knowledge, collaborate, and grow together.
                    </p>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Discover top swappers</span>
                    <Link href="/matches" aria-label="Find skill matches">
                      <Button className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl flex items-center gap-2" aria-label="Match Now">
                        <span>Match Now</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="glass-card p-6 flex flex-col justify-between hover:border-slate-700 transition duration-300">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-purple-400" />
                      <span>My Sessions</span>
                    </h2>
                    <p className="text-sm text-slate-400 mt-2">
                      Track your active video calls, upcoming peer meetings, and review past completed exchanges.
                    </p>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Manage calendar</span>
                    <Link href="/sessions" aria-label="View your sessions">
                      <Button className="bg-purple-700 hover:bg-purple-600 text-white rounded-2xl flex items-center gap-2" aria-label="View Sessions">
                        <span>View Sessions</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="glass-card p-6 flex flex-col justify-between hover:border-slate-700 transition duration-300">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-400" />
                      <span>Leaderboard</span>
                    </h2>
                    <p className="text-sm text-slate-400 mt-2">
                      See the top rated mentors and most active swappers in the community. Complete sessions and teach skills to rank up!
                    </p>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-xs text-slate-500">View rankings</span>
                    <Link href="/leaderboard" aria-label="View leaderboard rankings">
                      <Button className="bg-yellow-600 hover:bg-yellow-500 text-white rounded-2xl flex items-center gap-2 border border-yellow-500/20" aria-label="Leaderboard">
                        <span>Leaderboard</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="glass-card p-6 flex flex-col justify-between hover:border-slate-700 transition duration-300">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Award className="h-5 w-5 text-purple-400" />
                      <span>Earned Badges</span>
                    </h2>
                    <p className="text-sm text-slate-400 mt-2">
                      Showcase your expertise. Earn Mentor, Top Rated, or Verified skills badges for active teaching in the community.
                    </p>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-xs text-slate-500">View badges & details</span>
                    <Link href="/profile" aria-label="Open your profile">
                      <Button className="bg-slate-800 hover:bg-slate-700 text-white rounded-2xl flex items-center gap-2" aria-label="Open Profile">
                        <span>Open Profile</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
