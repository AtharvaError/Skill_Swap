'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Calendar, CheckCircle2, Circle, Coins, Star, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useMe } from '@/lib/hooks';
import type { Overview } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { ConnectionActions } from '@/components/ConnectionActions';
import PageTransition from '@/components/PageTransition';

function DashboardSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading dashboard">
      <div className="space-y-3">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-10 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card flex items-center gap-4 rounded-3xl p-5">
            <div className="skeleton h-12 w-12 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-6 w-16" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="skeleton h-56 rounded-3xl" />
        <div className="skeleton h-56 rounded-3xl" />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  tone: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="glass-card flex items-center gap-4 rounded-3xl p-5">
      <div className={`rounded-2xl border p-3.5 ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1 text-xl font-bold text-white">{value}</p>
        {hint ? <p className="truncate text-xs text-slate-500">{hint}</p> : null}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: user } = useMe();
  const { data: overview, isLoading, isError } = useQuery({
    queryKey: ['overview'],
    queryFn: async () => (await api.get<Overview>('/users/me/overview')).data,
  });

  const setupSteps = overview
    ? [
        { done: overview.profile.offeredSkills > 0, label: 'Add a skill you can teach', href: '/profile' },
        { done: overview.profile.wantedSkills > 0, label: 'Add a skill you want to learn', href: '/profile' },
        { done: overview.profile.availabilitySlots > 0, label: 'Set your weekly availability', href: '/profile' },
        { done: overview.profile.hasBio, label: 'Write a short bio', href: '/profile' },
        { done: overview.stats.connections > 0, label: 'Connect with your first match', href: '/matches' },
      ]
    : [];
  const remainingSteps = setupSteps.filter((step) => !step.done).length;

  return (
    <PageTransition>
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          {isLoading ? (
            <DashboardSkeleton />
          ) : isError || !overview ? (
            <section className="glass-card rounded-3xl p-10 text-center text-rose-200" role="alert">
              We couldn&apos;t load your dashboard. Please refresh the page.
            </section>
          ) : (
            <div className="space-y-8">
              <header>
                <p className="text-sm uppercase tracking-[0.3em] text-purple-300">Dashboard</p>
                <h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl">
                  Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  {overview.stats.pendingRequests > 0
                    ? `You have ${overview.stats.pendingRequests} connection request${overview.stats.pendingRequests === 1 ? '' : 's'} waiting.`
                    : overview.upcomingSessions.length > 0
                      ? `Your next session is ${formatDateTime(overview.upcomingSessions[0].scheduledAt)}.`
                      : 'Find someone to swap skills with.'}
                </p>
              </header>

              <section aria-label="Your statistics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon={<Users className="h-5 w-5" aria-hidden="true" />}
                  tone="border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  label="Connections"
                  value={String(overview.stats.connections)}
                  hint={
                    overview.stats.pendingRequests > 0
                      ? `${overview.stats.pendingRequests} pending`
                      : undefined
                  }
                />
                <StatCard
                  icon={<Calendar className="h-5 w-5" aria-hidden="true" />}
                  tone="border-blue-500/20 bg-blue-500/10 text-blue-400"
                  label="Sessions completed"
                  value={String(overview.stats.completedSessions)}
                  hint={
                    overview.upcomingSessions.length > 0
                      ? `${overview.upcomingSessions.length} upcoming`
                      : undefined
                  }
                />
                <StatCard
                  icon={<Star className="h-5 w-5 fill-amber-400" aria-hidden="true" />}
                  tone="border-amber-500/20 bg-amber-500/10 text-amber-400"
                  label="Average rating"
                  value={overview.stats.reviewCount > 0 ? `${overview.stats.ratingAvg.toFixed(1)} / 5` : '—'}
                  hint={
                    overview.stats.reviewCount > 0
                      ? `${overview.stats.reviewCount} review${overview.stats.reviewCount === 1 ? '' : 's'}`
                      : 'No reviews yet'
                  }
                />
                <Link href="/rewards" className="rounded-3xl transition hover:brightness-125" aria-label="Open rewards">
                  <StatCard
                    icon={<Coins className="h-5 w-5" aria-hidden="true" />}
                    tone="border-purple-500/20 bg-purple-500/10 text-purple-400"
                    label="Credits"
                    value={String(overview.stats.credits)}
                    hint={`${overview.stats.badges} badge${overview.stats.badges === 1 ? '' : 's'} earned`}
                  />
                </Link>
              </section>

              {remainingSteps > 0 ? (
                <section className="glass-card rounded-3xl p-6" aria-labelledby="setup-heading">
                  <h2 id="setup-heading" className="text-lg font-semibold text-white">
                    Finish setting up
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Matches are ranked by the skills and availability on your profile.
                  </p>
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {setupSteps.map((step) => (
                      <li key={step.label}>
                        {step.done ? (
                          <span className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-slate-500 line-through">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                            {step.label}
                          </span>
                        ) : (
                          <Link
                            href={step.href}
                            className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                          >
                            <Circle className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                            {step.label}
                            <ArrowRight className="ml-auto h-4 w-4 text-slate-500" aria-hidden="true" />
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-2">
                <section className="glass-card rounded-3xl p-6" aria-labelledby="upcoming-heading">
                  <div className="flex items-center justify-between gap-3">
                    <h2 id="upcoming-heading" className="text-lg font-semibold text-white">
                      Upcoming sessions
                    </h2>
                    <Link href="/sessions" className="text-sm text-purple-300 hover:text-purple-200">
                      View all
                    </Link>
                  </div>
                  {overview.upcomingSessions.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-400">
                      Nothing scheduled. Open a connection in{' '}
                      <Link href="/chat" className="text-purple-300 hover:underline">
                        Messages
                      </Link>{' '}
                      to plan a session.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {overview.upcomingSessions.map((session) => (
                        <li key={session.id}>
                          <Link
                            href={`/sessions/${session.id}`}
                            className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3 transition hover:bg-white/10"
                          >
                            <Avatar name={session.partner.name} src={session.partner.avatarUrl} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-white">
                                {session.topic ?? 'SkillSwap session'} with {session.partner.name}
                              </p>
                              <p className="text-sm text-slate-400">
                                {formatDateTime(session.scheduledAt)} · {session.durationMinutes} min
                              </p>
                            </div>
                            <ArrowRight className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="glass-card rounded-3xl p-6" aria-labelledby="requests-heading">
                  <div className="flex items-center justify-between gap-3">
                    <h2 id="requests-heading" className="text-lg font-semibold text-white">
                      Connection requests
                    </h2>
                    <Link href="/matches?tab=requests" className="text-sm text-purple-300 hover:text-purple-200">
                      View all
                    </Link>
                  </div>
                  {overview.incomingRequests.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-400">
                      No pending requests.{' '}
                      <Link href="/matches" className="text-purple-300 hover:underline">
                        Discover people
                      </Link>{' '}
                      who match your skills.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {overview.incomingRequests.map((request) => (
                        <li
                          key={request.matchId}
                          className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/[0.04] p-3"
                        >
                          <Avatar name={request.user.name} src={request.user.avatarUrl} />
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/users/${request.user.id}`}
                              className="block truncate font-medium text-white hover:underline"
                            >
                              {request.user.name}
                            </Link>
                            <p className="truncate text-sm text-slate-400">
                              {request.user.college ?? 'Wants to connect'}
                            </p>
                          </div>
                          <ConnectionActions
                            userId={request.user.id}
                            name={request.user.name}
                            matchId={request.matchId}
                            status="PENDING"
                            direction="incoming"
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </div>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
