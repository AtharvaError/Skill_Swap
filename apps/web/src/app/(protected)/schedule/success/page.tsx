'use client';

import Link from 'next/link';
import { PageTransition } from '@/components/PageTransition';

export default function ScheduleSuccessPage() {
  return (
    <PageTransition>
      <main className="min-h-screen bg-background px-6 py-8 text-white">
        <div className="mx-auto max-w-4xl glass-card rounded-3xl p-10 shadow-lg">
          <h1 className="text-3xl font-bold text-white">Google Calendar Connected</h1>
          <p className="mt-4 text-slate-400">Your calendar is now connected. Return to scheduling to create your SkillSwap session.</p>
          <nav className="mt-8 flex gap-3">
            <Link
              href="/matches"
              aria-label="Back to matches"
              className="rounded-2xl bg-purple-700 px-5 py-3 text-white hover:bg-purple-600"
            >
              Back to Matches
            </Link>
            <Link
              href="/sessions"
              aria-label="View sessions"
              className="rounded-2xl bg-slate-800 px-5 py-3 text-white hover:bg-slate-700"
            >
              View Sessions
            </Link>
          </nav>
        </div>
      </main>
    </PageTransition>
  );
}
