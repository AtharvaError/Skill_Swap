'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { PageTransition } from '@/components/PageTransition';

/** Where the API sends the browser back to after the Google OAuth round trip. */
function CalendarResult() {
  const failed = useSearchParams().get('status') === 'error';
  const queryClient = useQueryClient();

  useEffect(() => {
    // The connection status is part of the cached profile.
    queryClient.invalidateQueries({ queryKey: ['me'] });
  }, [queryClient]);

  return (
    <div className="mx-auto max-w-2xl glass-card rounded-3xl p-10">
      <h1 className="text-3xl font-bold text-white">
        {failed ? 'Google Calendar was not connected' : 'Google Calendar connected'}
      </h1>
      <p className="mt-4 text-slate-400">
        {failed
          ? 'Something went wrong while connecting your calendar, or the integration is not set up on this server. You can still schedule sessions and add them to your calendar manually.'
          : 'New sessions you schedule will be added to your calendar with a Meet link, and your partner will be invited.'}
      </p>
      <nav className="mt-8 flex flex-wrap gap-3" aria-label="Next steps">
        <Link
          href="/matches?tab=connections"
          className="rounded-2xl bg-purple-700 px-5 py-3 text-white hover:bg-purple-600"
        >
          Schedule a session
        </Link>
        <Link href="/sessions" className="rounded-2xl bg-white/5 px-5 py-3 text-white hover:bg-white/10">
          View sessions
        </Link>
      </nav>
    </div>
  );
}

export default function ScheduleSuccessPage() {
  return (
    <PageTransition>
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        {/* useSearchParams needs a Suspense boundary to prerender. */}
        <Suspense fallback={<div className="mx-auto max-w-2xl skeleton h-64 rounded-3xl" />}>
          <CalendarResult />
        </Suspense>
      </main>
    </PageTransition>
  );
}
