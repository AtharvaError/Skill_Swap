'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { formatRelative } from '@/lib/format';
import { useMe, useNow } from '@/lib/hooks';
import type { Connection } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import PageTransition from '@/components/PageTransition';

export default function MessagesPage() {
  const now = useNow();
  const { data: me } = useMe();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get<Connection[]>('/matches/connections')).data,
    refetchInterval: 20000,
  });

  return (
    <PageTransition>
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <header>
            <p className="text-sm uppercase tracking-[0.3em] text-purple-300">Messages</p>
            <h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl">Your conversations</h1>
            <p className="mt-2 text-sm text-slate-400">Chat with your connections and plan your next session.</p>
          </header>

          {isLoading ? (
            <div className="space-y-3" role="status" aria-label="Loading conversations">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-20 rounded-3xl" />
              ))}
            </div>
          ) : isError || !data ? (
            <section className="glass-card rounded-3xl p-10 text-center text-rose-200" role="alert">
              We couldn&apos;t load your conversations. Please refresh the page.
            </section>
          ) : data.length === 0 ? (
            <section className="glass-card rounded-3xl p-10 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-slate-600" aria-hidden="true" />
              <p className="mt-4 text-lg font-semibold text-white">No conversations yet</p>
              <p className="mt-2 text-sm text-slate-400">
                You can message someone once you are connected with them.
              </p>
              <Link
                href="/matches"
                className="mt-6 inline-flex rounded-xl bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600"
              >
                Find people to connect with
              </Link>
            </section>
          ) : (
            <ul className="space-y-3">
              {data.map((connection) => (
                <li key={connection.matchId}>
                  <Link
                    href={`/chat/${connection.matchId}`}
                    className="glass-card flex items-center gap-4 rounded-3xl p-4 transition hover:border-purple-500/40"
                  >
                    <Avatar name={connection.user.name} src={connection.user.avatarUrl} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate font-semibold text-white">{connection.user.name}</p>
                        <span className="shrink-0 text-xs text-slate-500">
                          {formatRelative(connection.lastActivityAt, now)}
                        </span>
                      </div>
                      <p className="truncate text-sm text-slate-400">
                        {connection.lastMessage
                          ? `${connection.lastMessage.senderId === me?.id ? 'You: ' : ''}${connection.lastMessage.content}`
                          : 'Say hello and plan your first session.'}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
