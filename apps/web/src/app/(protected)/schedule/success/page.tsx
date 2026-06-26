import Link from 'next/link';

export default function ScheduleSuccessPage() {
  return (
    <div className="min-h-screen bg-[#111018] px-6 py-8 text-white">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-800 bg-slate-950/90 p-10 shadow-lg shadow-slate-900/20">
        <h1 className="text-3xl font-bold text-white">Google Calendar Connected</h1>
        <p className="mt-4 text-slate-400">Your calendar is now connected. Return to scheduling to create your SkillSwap session.</p>
        <div className="mt-8 flex gap-3">
          <Link href="/matches" className="rounded-2xl bg-purple-700 px-5 py-3 text-white hover:bg-purple-600">Back to Matches</Link>
          <Link href="/sessions" className="rounded-2xl bg-slate-800 px-5 py-3 text-white hover:bg-slate-700">View Sessions</Link>
        </div>
      </div>
    </div>
  );
}
