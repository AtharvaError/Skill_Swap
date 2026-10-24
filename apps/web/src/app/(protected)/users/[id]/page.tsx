'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Award, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { AVAILABILITY_DAYS, AVAILABILITY_PERIODS, slotKey } from '@/lib/availability';
import type { PublicProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import { ConnectionActions } from '@/components/ConnectionActions';
import { SafetyActions } from '@/components/SafetyActions';
import PageTransition from '@/components/PageTransition';
import { Rating, Stars } from '@/components/Rating';

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => (await api.get<PublicProfile>(`/users/${id}`)).data,
    retry: false,
  });

  if (isLoading) {
    return (
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-4xl space-y-6" role="status" aria-label="Loading profile">
          <div className="skeleton h-40 rounded-3xl" />
          <div className="skeleton h-64 rounded-3xl" />
        </div>
      </main>
    );
  }

  if (isError || !profile) {
    return (
      <PageTransition>
        <main className="px-4 py-6 sm:px-6 sm:py-8">
          <section className="mx-auto max-w-3xl glass-card rounded-3xl p-10 text-center" role="alert">
            <p className="text-lg font-semibold text-white">Profile not found</p>
            <p className="mt-2 text-sm text-slate-400">This person may have left SkillSwap.</p>
            <Link
              href="/matches"
              className="mt-6 inline-flex rounded-xl bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600"
            >
              Back to Discover
            </Link>
          </section>
        </main>
      </PageTransition>
    );
  }

  const firstName = profile.name.split(' ')[0];

  return (
    <PageTransition>
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <header className="glass-card rounded-3xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <Avatar name={profile.name} src={profile.avatarUrl} size="xl" />
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-bold text-white sm:text-3xl">{profile.name}</h1>
                  <p className="truncate text-sm text-slate-400">{profile.college ?? 'No college listed'}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                    <Rating value={profile.ratingAvg} count={profile.reviewCount} />
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      {profile.completedSessions} session{profile.completedSessions === 1 ? '' : 's'} completed
                    </span>
                  </div>
                </div>
              </div>
              {profile.isMe ? (
                <Link
                  href="/profile"
                  className="inline-flex h-9 items-center rounded-lg bg-purple-700 px-4 text-sm font-medium text-white hover:bg-purple-600"
                >
                  Edit profile
                </Link>
              ) : profile.blockedByMe ? (
                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-slate-300">
                  You blocked {profile.name.split(' ')[0]}
                </span>
              ) : (
                <ConnectionActions
                  userId={profile.id}
                  name={profile.name}
                  matchId={profile.connection?.matchId ?? null}
                  status={profile.connection?.status ?? null}
                  direction={profile.connection?.direction ?? null}
                />
              )}
            </div>
            {profile.bio ? <p className="mt-5 whitespace-pre-wrap text-sm text-slate-300">{profile.bio}</p> : null}
            {profile.isMe ? (
              <p className="mt-5 rounded-2xl bg-white/[0.04] px-4 py-2 text-xs text-slate-400">
                This is how other people see your profile.
              </p>
            ) : (
              <SafetyActions userId={profile.id} name={profile.name} blocked={profile.blockedByMe} />
            )}
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="glass-card rounded-3xl p-6" aria-labelledby="offers-heading">
              <h2 id="offers-heading" className="text-lg font-semibold text-white">
                Can teach
              </h2>
              {profile.offeredSkills.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {profile.offeredSkills.map((skill) => (
                    <li
                      key={skill.skillId}
                      className="inline-flex items-center gap-2 rounded-full border border-purple-700/40 bg-purple-900/70 px-3 py-1.5 text-sm text-white"
                    >
                      {skill.name}
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.7rem] uppercase tracking-[0.12em] text-purple-100">
                        {skill.proficiency.toLowerCase()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-400">Nothing listed yet.</p>
              )}
            </section>

            <section className="glass-card rounded-3xl p-6" aria-labelledby="wants-heading">
              <h2 id="wants-heading" className="text-lg font-semibold text-white">
                Wants to learn
              </h2>
              {profile.wantedSkills.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {profile.wantedSkills.map((skill) => (
                    <li
                      key={skill.skillId}
                      className="rounded-full border border-emerald-600/40 bg-emerald-900/70 px-3 py-1.5 text-sm text-white"
                    >
                      {skill.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-400">Nothing listed yet.</p>
              )}
            </section>
          </div>

          <section className="glass-card rounded-3xl p-6" aria-labelledby="availability-heading">
            <h2 id="availability-heading" className="text-lg font-semibold text-white">
              Usually available
            </h2>
            {profile.availability.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[420px] border-separate border-spacing-1.5 text-sm">
                  <thead>
                    <tr>
                      <td />
                      {AVAILABILITY_DAYS.map((day) => (
                        <th key={day.key} scope="col" className="pb-1 text-xs font-medium text-slate-400">
                          {day.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {AVAILABILITY_PERIODS.map((period) => (
                      <tr key={period.key}>
                        <th scope="row" className="pr-2 text-left text-xs font-medium text-slate-400">
                          {period.label}
                        </th>
                        {AVAILABILITY_DAYS.map((day) => {
                          const free = profile.availability.includes(slotKey(day.key, period.key));
                          return (
                            <td key={day.key}>
                              <div
                                className={cn(
                                  'h-7 rounded-lg border',
                                  free
                                    ? 'border-emerald-500/60 bg-emerald-600/70'
                                    : 'border-white/[0.06] bg-white/[0.03]',
                                )}
                              >
                                <span className="sr-only">{free ? 'Available' : 'Not available'}</span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-400">{firstName} hasn&apos;t shared their availability yet.</p>
            )}
          </section>

          {profile.badges.length > 0 ? (
            <section className="glass-card rounded-3xl p-6" aria-labelledby="badges-heading">
              <h2 id="badges-heading" className="flex items-center gap-2 text-lg font-semibold text-white">
                <Award className="h-5 w-5 text-purple-400" aria-hidden="true" />
                Badges
              </h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {profile.badges.map(({ badge }) => (
                  <li key={badge.id} className="rounded-2xl border border-purple-500/30 bg-purple-950/40 px-4 py-3">
                    <p className="text-sm font-medium text-purple-100">{badge.name}</p>
                    <p className="text-xs text-slate-400">{badge.criteria}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="glass-card rounded-3xl p-6" aria-labelledby="reviews-heading">
            <h2 id="reviews-heading" className="text-lg font-semibold text-white">
              Reviews
            </h2>
            {profile.reviews.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {profile.reviews.map((review) => (
                  <li key={review.id} className="rounded-2xl bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar name={review.reviewer.name} src={review.reviewer.avatarUrl} size="sm" />
                        <Link
                          href={`/users/${review.reviewer.id}`}
                          className="truncate text-sm font-medium text-slate-200 hover:underline"
                        >
                          {review.reviewer.name}
                        </Link>
                      </div>
                      <Stars rating={review.rating} />
                    </div>
                    {review.comment ? <p className="mt-2 text-sm text-slate-300">{review.comment}</p> : null}
                    <p className="mt-2 text-xs text-slate-500">
                      {new Date(review.createdAt).toLocaleDateString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-400">No reviews yet.</p>
            )}
          </section>
        </div>
      </main>
    </PageTransition>
  );
}
