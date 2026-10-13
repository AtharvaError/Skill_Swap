'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { formatSlot } from '@/lib/availability';
import { formatDateTime, formatRelative } from '@/lib/format';
import { useDebounced, useNow } from '@/lib/hooks';
import type { Connection, ConnectionRequests, MatchSuggestion } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import { ConnectionActions } from '@/components/ConnectionActions';
import PageTransition, { StaggerItem, StaggerList } from '@/components/PageTransition';
import { Rating } from '@/components/Rating';
import { Input } from '@/components/ui/input';

const TABS = [
  { key: 'discover', label: 'Discover' },
  { key: 'requests', label: 'Requests' },
  { key: 'connections', label: 'Connections' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

function CardSkeleton() {
  return (
    <div className="glass-card space-y-4 rounded-3xl p-6">
      <div className="flex items-center gap-4">
        <div className="skeleton h-14 w-14 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-5 w-1/2" />
          <div className="skeleton h-4 w-1/3" />
        </div>
      </div>
      <div className="skeleton h-16 rounded-2xl" />
      <div className="skeleton h-9 w-40 rounded-xl" />
    </div>
  );
}

function SkillChips({ skills, tone, empty }: { skills: { name: string }[]; tone: string; empty: string }) {
  if (skills.length === 0) {
    return <p className="mt-2 text-sm text-slate-500">{empty}</p>;
  }
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {skills.map((skill) => (
        <li key={skill.name} className={cn('rounded-full px-3 py-1 text-xs font-medium', tone)}>
          {skill.name}
        </li>
      ))}
    </ul>
  );
}

function MatchCard({ match }: { match: MatchSuggestion }) {
  const { wantedByMe, offeredByMe } = match.overlappingSkills;
  const noOverlap = wantedByMe.length === 0 && offeredByMe.length === 0;

  return (
    <article className="glass-card rounded-3xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={match.name} src={match.avatarUrl} size="lg" />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-white">
              <Link href={`/users/${match.userId}`} className="hover:underline">
                {match.name}
              </Link>
            </h2>
            <p className="truncate text-sm text-slate-400">{match.college ?? 'No college listed'}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <Rating value={match.ratingAvg} count={match.reviewCount} />
              {match.completedSessions > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  {match.completedSessions} session{match.completedSessions === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div
          className={cn(
            'rounded-full px-4 py-2 text-sm font-semibold ring-1',
            match.matchPercent >= 50
              ? 'bg-emerald-950/60 text-emerald-300 ring-emerald-500/30'
              : match.matchPercent >= 20
                ? 'bg-amber-950/40 text-amber-200 ring-amber-500/30'
                : 'bg-slate-900/80 text-slate-400 ring-white/10',
          )}
        >
          {match.matchPercent}% match
        </div>
      </div>

      {match.bio ? <p className="mt-4 line-clamp-2 text-sm text-slate-300">{match.bio}</p> : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {noOverlap ? 'They can teach' : 'They can teach you'}
          </h3>
          <SkillChips
            skills={noOverlap ? match.offeredSkills : wantedByMe}
            tone={noOverlap ? 'bg-white/5 text-slate-300' : 'bg-emerald-900/70 text-emerald-200'}
            empty={noOverlap ? 'No skills listed yet.' : 'Nothing on your wanted list.'}
          />
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {noOverlap ? 'They want to learn' : 'You can teach them'}
          </h3>
          <SkillChips
            skills={noOverlap ? match.wantedSkills : offeredByMe}
            tone={noOverlap ? 'bg-white/5 text-slate-300' : 'bg-purple-900/70 text-purple-200'}
            empty={noOverlap ? 'No skills listed yet.' : 'Nothing you offer yet.'}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
        <ConnectionActions
          userId={match.userId}
          name={match.name}
          matchId={match.matchId}
          status={match.connectionStatus}
          direction={match.connectionDirection}
        />
        {match.sharedAvailability.length > 0 ? (
          <p className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Both free: {match.sharedAvailability.slice(0, 2).map(formatSlot).join(', ')}
            {match.sharedAvailability.length > 2 ? ` +${match.sharedAvailability.length - 2} more` : ''}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function DiscoverTab() {
  const [search, setSearch] = useState('');
  const query = useDebounced(search.trim(), 300);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['matches', query],
    queryFn: async () =>
      (await api.get<MatchSuggestion[]>('/matches', { params: query ? { q: query } : undefined })).data,
    placeholderData: (previous) => previous,
  });

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, skill, category or college"
          aria-label="Search people"
          className="h-12 rounded-2xl pl-11 text-white"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-6" role="status" aria-label="Loading matches">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : isError ? (
        <section className="glass-card rounded-3xl p-10 text-center text-rose-200" role="alert">
          We couldn&apos;t load matches. Please try again.
        </section>
      ) : !data || data.length === 0 ? (
        <section className="glass-card rounded-3xl p-10 text-center">
          <p className="text-lg font-semibold text-white">
            {query ? `Nobody matches “${query}”` : 'No one else has joined yet'}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {query
              ? 'Try a different skill or a broader search.'
              : 'Invite a friend, or add more skills to your profile so matches can find you.'}
          </p>
          {!query ? (
            <Link
              href="/profile"
              className="mt-6 inline-flex rounded-xl bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600"
            >
              Update profile skills
            </Link>
          ) : null}
        </section>
      ) : (
        <StaggerList className="grid gap-6">
          {data.map((match) => (
            <StaggerItem key={match.userId}>
              <MatchCard match={match} />
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}

function PersonRow({
  user,
  detail,
  children,
}: {
  user: { id: string; name: string; avatarUrl: string | null };
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <li className="glass-card flex flex-wrap items-center gap-4 rounded-3xl p-4">
      <Avatar name={user.name} src={user.avatarUrl} />
      <div className="min-w-0 flex-1">
        <Link href={`/users/${user.id}`} className="block truncate font-semibold text-white hover:underline">
          {user.name}
        </Link>
        <p className="truncate text-sm text-slate-400">{detail}</p>
      </div>
      {children}
    </li>
  );
}

function RequestsTab() {
  const now = useNow();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['requests'],
    queryFn: async () => (await api.get<ConnectionRequests>('/matches/requests')).data,
  });

  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading requests">
        <div className="skeleton h-20 rounded-3xl" />
        <div className="skeleton h-20 rounded-3xl" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <section className="glass-card rounded-3xl p-10 text-center text-rose-200" role="alert">
        We couldn&apos;t load your requests. Please try again.
      </section>
    );
  }
  if (data.incoming.length === 0 && data.outgoing.length === 0) {
    return (
      <section className="glass-card rounded-3xl p-10 text-center">
        <p className="text-lg font-semibold text-white">No pending requests</p>
        <p className="mt-2 text-sm text-slate-400">
          When you ask someone to connect, or they ask you, it shows up here.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      {data.incoming.length > 0 ? (
        <section aria-labelledby="incoming-heading">
          <h2 id="incoming-heading" className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Waiting for you
          </h2>
          <ul className="space-y-3">
            {data.incoming.map((request) => (
              <PersonRow
                key={request.matchId}
                user={request.user}
                detail={`Asked to connect ${formatRelative(request.createdAt, now)}`}
              >
                <ConnectionActions
                  userId={request.user.id}
                  name={request.user.name}
                  matchId={request.matchId}
                  status="PENDING"
                  direction="incoming"
                />
              </PersonRow>
            ))}
          </ul>
        </section>
      ) : null}

      {data.outgoing.length > 0 ? (
        <section aria-labelledby="outgoing-heading">
          <h2 id="outgoing-heading" className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Sent by you
          </h2>
          <ul className="space-y-3">
            {data.outgoing.map((request) => (
              <PersonRow
                key={request.matchId}
                user={request.user}
                detail={`Sent ${formatRelative(request.createdAt, now)}`}
              >
                <ConnectionActions
                  userId={request.user.id}
                  name={request.user.name}
                  matchId={request.matchId}
                  status="PENDING"
                  direction="outgoing"
                />
              </PersonRow>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ConnectionsTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get<Connection[]>('/matches/connections')).data,
  });

  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading connections">
        <div className="skeleton h-20 rounded-3xl" />
        <div className="skeleton h-20 rounded-3xl" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <section className="glass-card rounded-3xl p-10 text-center text-rose-200" role="alert">
        We couldn&apos;t load your connections. Please try again.
      </section>
    );
  }
  if (data.length === 0) {
    return (
      <section className="glass-card rounded-3xl p-10 text-center">
        <p className="text-lg font-semibold text-white">No connections yet</p>
        <p className="mt-2 text-sm text-slate-400">
          Send a request from Discover. Once it&apos;s accepted you can chat and schedule sessions.
        </p>
      </section>
    );
  }

  return (
    <ul className="space-y-3">
      {data.map((connection) => (
        <PersonRow
          key={connection.matchId}
          user={connection.user}
          detail={
            connection.nextSession
              ? `Next session ${formatDateTime(connection.nextSession.scheduledAt)}`
              : (connection.user.college ?? 'Connected')
          }
        >
          <ConnectionActions
            userId={connection.user.id}
            name={connection.user.name}
            matchId={connection.matchId}
            status="ACCEPTED"
            direction={null}
          />
        </PersonRow>
      ))}
    </ul>
  );
}

function MatchesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get('tab');
  const tab: TabKey = TABS.some((t) => t.key === requested) ? (requested as TabKey) : 'discover';

  const { data: requests } = useQuery({
    queryKey: ['requests'],
    queryFn: async () => (await api.get<ConnectionRequests>('/matches/requests')).data,
  });
  const incomingCount = requests?.incoming.length ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-purple-300">Discover</p>
        <h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl">Find your next skill swap</h1>
        <p className="mt-2 text-sm text-slate-400">
          Ranked by how well your skills and weekly availability line up, plus each person&apos;s rating and experience.
        </p>
      </header>

      <div className="flex gap-1 rounded-2xl bg-white/[0.04] p-1" role="tablist" aria-label="People">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`tab-${key}`}
            aria-selected={tab === key}
            aria-controls="people-panel"
            onClick={() => router.replace(key === 'discover' ? '/matches' : `/matches?tab=${key}`)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
              tab === key ? 'bg-purple-700 text-white' : 'text-slate-400 hover:text-white',
            )}
          >
            {label}
            {key === 'requests' && incomingCount > 0 ? (
              <span className="rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-white">
                {incomingCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div id="people-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'discover' ? <DiscoverTab /> : tab === 'requests' ? <RequestsTab /> : <ConnectionsTab />}
      </div>
    </div>
  );
}

export default function MatchesPage() {
  return (
    <PageTransition>
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        {/* useSearchParams needs a Suspense boundary to prerender. */}
        <Suspense fallback={<div className="mx-auto max-w-4xl"><CardSkeleton /></div>}>
          <MatchesContent />
        </Suspense>
      </main>
    </PageTransition>
  );
}
