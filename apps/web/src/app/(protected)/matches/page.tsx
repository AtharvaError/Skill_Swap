'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

function MatchSkeleton() {
  return (
    <div className="animate-pulse space-y-4 rounded-3xl border border-slate-800 bg-slate-950/90 p-6">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-slate-800"></div>
        <div className="space-y-2 flex-1">
          <div className="h-5 w-3/4 rounded-full bg-slate-800"></div>
          <div className="h-4 w-1/2 rounded-full bg-slate-800"></div>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="h-10 rounded-2xl bg-slate-800"></div>
        <div className="h-10 rounded-2xl bg-slate-800"></div>
        <div className="h-10 rounded-2xl bg-slate-800"></div>
      </div>
      <div className="flex gap-3">
        <div className="h-11 w-full rounded-2xl bg-slate-800"></div>
        <div className="h-11 w-full rounded-2xl bg-slate-800"></div>
      </div>
    </div>
  );
}

export default function MatchesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      const res = await api.get('/matches');
      return res.data as Array<{
        userId: string;
        matchId: string | null;
        isConnected: boolean;
        name: string;
        avatarUrl?: string;
        college?: string;
        matchPercent: number;
        overlappingSkills: {
          wantedByMe: Array<{ name: string; category: string }>;
          offeredByMe: Array<{ name: string; category: string }>;
        };
      }>;
    },
  });

  const connectMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      await api.post(`/matches/connect/${targetUserId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });

  const sortedMatches = useMemo(() => data ?? [], [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111018] px-6 py-8 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-purple-300">Find Matches</p>
              <h1 className="text-4xl font-bold text-white">Discover your best SkillSwap matches</h1>
            </div>
          </div>
          <div className="grid gap-6">
            <MatchSkeleton />
            <MatchSkeleton />
            <MatchSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111018] px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-purple-300">Find Matches</p>
            <h1 className="text-4xl font-bold text-white">Discover your best SkillSwap matches</h1>
            <p className="mt-2 text-sm text-slate-400">Matching is based on skills, availability, rating, and experience.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => router.push('/dashboard')} className="bg-white/5 text-white hover:bg-white/10">Back to Dashboard</Button>
          </div>
        </div>

        {sortedMatches.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-10 text-center text-slate-300 shadow-lg shadow-slate-900/20">
            <p className="text-lg font-semibold text-white">No matches found yet.</p>
            <p className="mt-2 text-sm text-slate-400">Add more skills to your offered and wanted lists to improve your match score.</p>
            <Button onClick={() => router.push('/profile')} className="mt-6 bg-purple-700 text-white hover:bg-purple-600">Update Profile Skills</Button>
          </div>
        ) : (
          <div className="grid gap-6">
            {sortedMatches.map((match) => (
              <Card key={match.userId} className="bg-slate-950/90 border border-slate-800 shadow-lg shadow-violet-900/20">
                <CardHeader className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-purple-900 text-2xl font-semibold text-white">
                      {match.avatarUrl ? <img src={match.avatarUrl} alt={match.name} className="h-full w-full object-cover" /> : match.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-white">{match.name}</h2>
                      <p className="text-sm text-slate-400">{match.college ?? 'No college listed'}</p>
                    </div>
                  </div>
                  <div className="rounded-full bg-slate-900/90 px-4 py-2 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-500/20">
                    {match.matchPercent}% match
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 px-6 pb-6 pt-0">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">Skills they offer that you want</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {match.overlappingSkills.wantedByMe.length > 0 ? (
                          match.overlappingSkills.wantedByMe.map((skill) => (
                            <span key={skill.name} className="rounded-full bg-emerald-900/80 px-3 py-1 text-xs uppercase tracking-[0.18em] text-emerald-200">{skill.name}</span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">No direct offered matches.</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">Skills they want that you offer</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {match.overlappingSkills.offeredByMe.length > 0 ? (
                          match.overlappingSkills.offeredByMe.map((skill) => (
                            <span key={skill.name} className="rounded-full bg-purple-900/80 px-3 py-1 text-xs uppercase tracking-[0.18em] text-purple-200">{skill.name}</span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">No direct requested matches.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => connectMutation.mutate(match.userId)}
                      className="bg-emerald-600 text-white hover:bg-emerald-500"
                      disabled={match.isConnected}
                    >
                      {match.isConnected ? 'Connected' : 'Connect'}
                    </Button>
                    <Button
                      onClick={() => router.push(match.matchId ? `/chat/${match.matchId}` : '#')}
                      className="bg-white/5 text-white hover:bg-white/10"
                      disabled={!match.isConnected || !match.matchId}
                    >
                      Chat
                    </Button>
                    <Button
                      onClick={() => router.push(match.matchId ? `/schedule/${match.matchId}` : '#')}
                      className="bg-white/5 text-white hover:bg-white/10"
                      disabled={!match.isConnected || !match.matchId}
                    >
                      Schedule
                    </Button>
                  </div>
                  <div className="text-sm text-slate-400">Breakdown: skill overlap, availability, rating & experience</div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
