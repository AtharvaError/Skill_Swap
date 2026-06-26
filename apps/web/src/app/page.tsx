import Link from 'next/link';
import { ArrowRight, Users, Zap, Star, MessageSquare, Calendar, Trophy } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0910] text-white overflow-hidden">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-purple-700/20 blur-[120px]" />
        <div className="absolute top-1/2 -right-60 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-violet-800/10 blur-[100px]" />
      </div>

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-12">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-700 shadow-lg shadow-purple-900/40">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">SkillSwap</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Get started free
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10">
        <section className="mx-auto max-w-5xl px-6 pt-20 pb-28 text-center sm:pt-28 sm:pb-36">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-900/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-purple-300 backdrop-blur-sm mb-8">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-400" />
            </span>
            Peer-to-peer skill exchange
          </div>

          <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
            Learn by teaching.
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Grow together.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
            SkillSwap connects you with peers who have the skills you want — and want the skills you have.
            Schedule sessions, chat in real time, and level up through mutual exchange.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-violet-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-900/40 transition hover:from-purple-500 hover:to-violet-500"
            >
              Start swapping skills
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>

          {/* Social proof */}
          <p className="mt-8 text-sm text-slate-500">
            Join the growing community of skill-sharers on campus
          </p>
        </section>

        {/* Features grid */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Users,
                color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/20',
                iconColor: 'text-emerald-400',
                title: 'Smart Matching',
                description:
                  'Our algorithm scores compatibility using skill overlap, ratings, availability, and session experience.',
              },
              {
                icon: MessageSquare,
                color: 'from-purple-500/20 to-violet-500/10 border-purple-500/20',
                iconColor: 'text-purple-400',
                title: 'Real-time Chat',
                description:
                  'Chat instantly with your matches using our WebSocket-powered messenger with typing indicators.',
              },
              {
                icon: Calendar,
                color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/20',
                iconColor: 'text-blue-400',
                title: 'Session Scheduling',
                description:
                  'Book 1-on-1 sessions with Google Calendar integration and Daily.co video calls built in.',
              },
              {
                icon: Star,
                color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/20',
                iconColor: 'text-amber-400',
                title: 'Reviews & Ratings',
                description:
                  'After every session, leave a review. Build your reputation as a top-rated mentor.',
              },
              {
                icon: Trophy,
                color: 'from-rose-500/20 to-pink-500/10 border-rose-500/20',
                iconColor: 'text-rose-400',
                title: 'Leaderboard & Badges',
                description:
                  'Earn badges for expertise and climb the leaderboard as you complete more swaps.',
              },
              {
                icon: Zap,
                color: 'from-violet-500/20 to-purple-500/10 border-violet-500/20',
                iconColor: 'text-violet-400',
                title: 'Any Skill, Any Level',
                description:
                  'From coding to guitar — add skills you offer and skills you want, and let SkillSwap do the rest.',
              },
            ].map(({ icon: Icon, color, iconColor, title, description }) => (
              <div
                key={title}
                className={`rounded-3xl border bg-gradient-to-br ${color} p-6 backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-900/20`}
              >
                <div className={`mb-4 inline-flex rounded-2xl bg-black/20 p-3 ${iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA banner */}
        <section className="mx-auto max-w-4xl px-6 pb-24">
          <div className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-900/50 via-violet-900/40 to-indigo-900/30 p-10 text-center shadow-2xl shadow-purple-900/30 backdrop-blur-sm">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-purple-600/20 blur-[80px]" />
              <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-violet-700/20 blur-[80px]" />
            </div>
            <h2 className="relative text-3xl font-bold text-white sm:text-4xl">
              Ready to swap your first skill?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-slate-300">
              Create a free account in seconds. Add the skills you offer and the skills you want,
              and start connecting with the right people.
            </p>
            <Link
              href="/signup"
              className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-slate-900 shadow-lg transition hover:bg-slate-100"
            >
              Create your free account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-8 text-center text-sm text-slate-500">
        <p>© {new Date().getFullYear()} SkillSwap · Built for learners, by learners.</p>
      </footer>
    </div>
  );
}
