'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Trophy, Award, Star, Calendar, Users, ArrowRight, User } from 'lucide-react';

export default function DashboardPage() {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data;
    },
  });

  const ratingAvg = user?.ratingAvg ?? 0;
  const badgeCount = user?.badges?.length ?? 0;

  return (
    <div className="min-h-screen bg-[#111018] px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-purple-300">Workspace</p>
            <h1 className="text-4xl font-bold text-white mt-1">SkillSwap Dashboard</h1>
            <p className="mt-2 text-sm text-slate-400">
              Welcome back, <span className="text-purple-300 font-semibold">{user?.name}</span>! Ready to swap skills?
            </p>
          </div>
          <Link href="/profile">
            <Button className="bg-purple-700 text-white hover:bg-purple-600 flex items-center gap-2 rounded-2xl">
              <User className="h-4 w-4" />
              <span>View Profile</span>
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Star className="h-5 w-5 fill-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Average Rating</p>
              <p className="text-xl font-bold mt-1 text-white">{ratingAvg.toFixed(1)} / 5.0</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Badges Earned</p>
              <p className="text-xl font-bold mt-1 text-white">{badgeCount}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Matches</p>
              <p className="text-xl font-bold mt-1 text-white">Find Connections</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Sessions</p>
              <p className="text-xl font-bold mt-1 text-white">Scheduled Chats</p>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Matches & Swap */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 flex flex-col justify-between hover:border-slate-700 transition duration-300">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-400" />
                <span>Skill Matches</span>
              </h3>
              <p className="text-sm text-slate-400 mt-2">
                Connect with users matching your offered or desired learning skills. Trade knowledge, collaborate, and grow together.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <span className="text-xs text-slate-500">Discover top swappers</span>
              <Link href="/matches">
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl flex items-center gap-2">
                  <span>Match Now</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Sessions & Calls */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 flex flex-col justify-between hover:border-slate-700 transition duration-300">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-400" />
                <span>My Sessions</span>
              </h3>
              <p className="text-sm text-slate-400 mt-2">
                Track your active video calls, upcoming peer meetings, and review past completed exchanges.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <span className="text-xs text-slate-500">Manage calendar</span>
              <Link href="/sessions">
                <Button className="bg-purple-700 hover:bg-purple-600 text-white rounded-2xl flex items-center gap-2">
                  <span>View Sessions</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 flex flex-col justify-between hover:border-slate-700 transition duration-300">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
                <span>Leaderboard</span>
              </h3>
              <p className="text-sm text-slate-400 mt-2">
                See the top rated mentors and most active swappers in the community. Complete sessions and teach skills to rank up!
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <span className="text-xs text-slate-500">View rankings</span>
              <Link href="/leaderboard">
                <Button className="bg-yellow-600 hover:bg-yellow-500 text-white rounded-2xl flex items-center gap-2 border border-yellow-500/20">
                  <span>Leaderboard</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Profile */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 flex flex-col justify-between hover:border-slate-700 transition duration-300">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-400" />
                <span>Earned Badges</span>
              </h3>
              <p className="text-sm text-slate-400 mt-2">
                Showcase your expertise. Earn Mentor, Top Rated, or Verified skills badges for active teaching in the community.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <span className="text-xs text-slate-500">View badges & details</span>
              <Link href="/profile">
                <Button className="bg-slate-800 hover:bg-slate-700 text-white rounded-2xl flex items-center gap-2">
                  <span>Open Profile</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
