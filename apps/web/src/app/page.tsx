import Link from 'next/link';
import {
  ArrowLeftRight,
  ArrowRight,
  Calendar,
  Coins,
  Gift,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Zap,
} from 'lucide-react';

// One palette for the whole page: coral for teaching, mint for learning,
// violet/fuchsia as the brand, amber for credits.
const SKILLS = [
  { name: 'Python', tone: 'bg-cyan-400/15 text-cyan-200 ring-cyan-400/30' },
  { name: 'Guitar', tone: 'bg-orange-400/15 text-orange-200 ring-orange-400/30' },
  { name: 'Figma', tone: 'bg-fuchsia-400/15 text-fuchsia-200 ring-fuchsia-400/30' },
  { name: 'Public Speaking', tone: 'bg-amber-400/15 text-amber-200 ring-amber-400/30' },
  { name: 'Piano', tone: 'bg-emerald-400/15 text-emerald-200 ring-emerald-400/30' },
  { name: 'UI Design', tone: 'bg-violet-400/15 text-violet-200 ring-violet-400/30' },
  { name: 'Interview Coaching', tone: 'bg-rose-400/15 text-rose-200 ring-rose-400/30' },
  { name: 'JavaScript', tone: 'bg-yellow-400/15 text-yellow-200 ring-yellow-400/30' },
  { name: 'Illustration', tone: 'bg-pink-400/15 text-pink-200 ring-pink-400/30' },
  { name: 'Leadership', tone: 'bg-sky-400/15 text-sky-200 ring-sky-400/30' },
  { name: 'Singing', tone: 'bg-lime-400/15 text-lime-200 ring-lime-400/30' },
  { name: 'SQL', tone: 'bg-teal-400/15 text-teal-200 ring-teal-400/30' },
];

const STEPS = [
  {
    title: 'List your skills',
    body: 'Add what you can teach and what you want to learn, plus when you are usually free.',
    color: 'from-orange-400 to-rose-500',
    glow: 'shadow-orange-500/30',
  },
  {
    title: 'Connect with a match',
    body: 'Discover ranks people by two-way skill fit and shared availability. Send a request, start chatting.',
    color: 'from-fuchsia-500 to-violet-600',
    glow: 'shadow-fuchsia-500/30',
  },
  {
    title: 'Swap or book a lesson',
    body: 'Teach each other for free, or pay for a lesson in credits you earned by teaching someone else.',
    color: 'from-emerald-400 to-cyan-500',
    glow: 'shadow-emerald-500/30',
  },
];

function GradientButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative inline-flex items-center gap-2 rounded-full bg-[linear-gradient(110deg,#fb923c,#f43f5e,#d946ef,#8b5cf6,#fb923c)] bg-[length:250%_100%] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-900/40 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-safe:animate-gradient"
    >
      {children}
    </Link>
  );
}

function OutlineButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500 p-px transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="block rounded-full bg-background px-7 py-[13px] text-sm font-semibold text-white transition-colors hover:bg-background/70">
        {children}
      </span>
    </Link>
  );
}

function SwapCard({
  initial,
  name,
  avatar,
  teaches,
  wants,
  className,
}: {
  initial: string;
  name: string;
  avatar: string;
  teaches: string;
  wants: string;
  className: string;
}) {
  return (
    <div
      className={`w-60 rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/40 backdrop-blur-xl ${className}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-bold text-white ${avatar}`}
        >
          {initial}
        </span>
        <div>
          <p className="font-semibold text-white">{name}</p>
          <p className="flex items-center gap-1 text-xs text-amber-300">
            <Star className="h-3 w-3 fill-amber-300" aria-hidden="true" /> 4.9
          </p>
        </div>
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Teaches</p>
      <p className="mt-1 inline-block rounded-full bg-orange-400/15 px-3 py-1 text-sm font-medium text-orange-200 ring-1 ring-orange-400/30">
        {teaches}
      </p>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Wants to learn</p>
      <p className="mt-1 inline-block rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-medium text-emerald-200 ring-1 ring-emerald-400/30">
        {wants}
      </p>
    </div>
  );
}

function HeroVisual() {
  return (
    // An illustration of a two-way match; hidden from screen readers. Drawn
    // at 520px wide and zoomed to fit narrower columns, so nothing collides.
    <div className="relative mx-auto h-[420px] w-[520px] max-sm:[zoom:0.65] lg:[zoom:0.9]" aria-hidden="true">
      <div className="absolute left-6 top-10 h-56 w-56 rounded-full bg-orange-500/30 blur-[80px]" />
      <div className="absolute bottom-6 right-4 h-56 w-56 rounded-full bg-cyan-400/25 blur-[80px]" />
      <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-600/30 blur-[70px]" />

      <SwapCard
        initial="P"
        name="Priya"
        avatar="from-orange-400 to-rose-500"
        teaches="Guitar"
        wants="Python"
        className="absolute left-0 top-4 -rotate-6 motion-safe:animate-float"
      />
      <SwapCard
        initial="A"
        name="Aarav"
        avatar="from-emerald-400 to-cyan-500"
        teaches="Python"
        wants="Guitar"
        className="absolute bottom-2 right-0 rotate-6 motion-safe:animate-float-slow"
      />

      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[conic-gradient(from_180deg,#fb923c,#f43f5e,#d946ef,#8b5cf6,#22d3ee,#34d399,#fb923c)] p-[3px] shadow-xl shadow-fuchsia-900/50">
          <span className="flex h-full w-full items-center justify-center rounded-full bg-background">
            <ArrowLeftRight className="h-6 w-6 text-white" />
          </span>
        </span>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-900 shadow-lg">96% match</span>
      </div>

      <span className="absolute right-10 top-6 rounded-full bg-fuchsia-400/15 px-3 py-1 text-xs font-medium text-fuchsia-200 ring-1 ring-fuchsia-400/30 backdrop-blur motion-safe:animate-float-slow">
        Figma
      </span>
      <span className="absolute bottom-16 left-4 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-medium text-amber-200 ring-1 ring-amber-400/30 backdrop-blur motion-safe:animate-float">
        Public Speaking
      </span>
      <span className="absolute right-2 top-1/2 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-3 py-1 text-xs font-bold text-slate-900 shadow-lg shadow-amber-900/40 motion-safe:animate-float">
        <Coins className="h-3.5 w-3.5" /> +4 credits
      </span>
    </div>
  );
}

const FEATURES = [
  {
    icon: Users,
    title: 'Two-way matching',
    body: 'Ranked by skills you can trade both ways, shared free time, ratings and experience.',
    tone: 'from-violet-500/25 to-fuchsia-500/10 ring-violet-400/25',
    iconTone: 'bg-violet-500/20 text-violet-200',
  },
  {
    icon: MessageSquare,
    title: 'Real-time chat',
    body: 'Talk it through with typing indicators and online status, right inside SkillSwap.',
    tone: 'from-cyan-500/25 to-sky-500/10 ring-cyan-400/25',
    iconTone: 'bg-cyan-500/20 text-cyan-200',
  },
  {
    icon: Calendar,
    title: 'Sessions and video',
    body: 'Pick a time, add it to your calendar, and join the call when it starts.',
    tone: 'from-orange-500/25 to-rose-500/10 ring-orange-400/25',
    iconTone: 'bg-orange-500/20 text-orange-200',
  },
  {
    icon: Star,
    title: 'Reviews and badges',
    body: 'Rate each other after every session and earn badges like First Swap and Mentor.',
    tone: 'from-rose-500/25 to-pink-500/10 ring-rose-400/25',
    iconTone: 'bg-rose-500/20 text-rose-200',
  },
  {
    icon: ShieldCheck,
    title: 'Safe by design',
    body: 'Connections need consent, and you can report or block anyone at any time.',
    tone: 'from-emerald-500/25 to-teal-500/10 ring-emerald-400/25',
    iconTone: 'bg-emerald-500/20 text-emerald-200',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="SkillSwap home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 via-fuchsia-500 to-violet-600 shadow-lg shadow-fuchsia-900/40">
              <Zap className="h-4 w-4 text-white" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold tracking-tight">SkillSwap</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex" aria-label="Sections">
            <a href="#how" className="transition hover:text-white">
              How it works
            </a>
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#credits" className="transition hover:text-white">
              Credits
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-orange-100"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section aria-labelledby="hero-heading" className="relative">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
            <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-violet-700/25 blur-[140px]" />
            <div className="absolute -right-32 top-20 h-[420px] w-[420px] rounded-full bg-orange-500/15 blur-[140px]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
          </div>

          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.35fr_1fr] lg:pt-24">
            <div className="text-center lg:text-left">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-200 ring-1 ring-white/10">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                Peer-to-peer skill exchange
              </p>
              <h1
                id="hero-heading"
                className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-[3.6rem]"
              >
                {/* Each phrase stays on one line on desktop. */}
                <span className="block lg:whitespace-nowrap">
                  <span className="bg-gradient-to-r from-orange-300 via-rose-400 to-fuchsia-400 bg-clip-text text-transparent">
                    Teach
                  </span>{' '}
                  what you know.
                </span>
                <span className="block lg:whitespace-nowrap">
                  <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
                    Learn
                  </span>{' '}
                  what you love.
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-300 lg:mx-0">
                SkillSwap matches you with people who have the skills you want and want the skills you have. Trade an
                hour of guitar for an hour of Python, no money involved.
              </p>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
                <GradientButton href="/signup">
                  Start swapping, it&apos;s free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </GradientButton>
                <OutlineButton href="/login">I have an account</OutlineButton>
              </div>
              <p className="mt-6 text-sm text-slate-400">
                Free to join, with <span className="font-semibold text-amber-300">8 credits</span> to book your first
                lessons.
              </p>
            </div>

            <HeroVisual />
          </div>
        </section>

        {/* Skill marquee */}
        <section aria-label="Skills people swap" className="border-y border-white/[0.06] bg-white/[0.02] py-5">
          <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <ul className="flex w-max gap-3 motion-safe:animate-marquee">
              {/* The list is doubled so the scroll loops seamlessly. */}
              {[...SKILLS, ...SKILLS].map((skill, index) => (
                <li
                  key={`${skill.name}-${index}`}
                  aria-hidden={index >= SKILLS.length}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ring-1 ${skill.tone}`}
                >
                  {skill.name}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="how" aria-labelledby="how-heading" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-[0.25em] text-fuchsia-300">How it works</p>
          <h2 id="how-heading" className="mt-3 text-center text-3xl font-bold sm:text-4xl">
            From &ldquo;I wish I knew&rdquo; to your first swap
          </h2>
          <ol className="mt-14 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="relative rounded-3xl border border-white/[0.08] bg-white/[0.03] p-7 transition hover:-translate-y-1 hover:bg-white/[0.05]"
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-extrabold text-white shadow-lg ${step.color} ${step.glow}`}
                >
                  {index + 1}
                </span>
                <h3 className="mt-5 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-slate-400">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section
          id="features"
          aria-labelledby="features-heading"
          className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-24 sm:px-6"
        >
          <p className="text-center text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Features</p>
          <h2 id="features-heading" className="mt-3 text-center text-3xl font-bold sm:text-4xl">
            Everything a swap needs
          </h2>
          <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body, tone, iconTone }) => (
              <li
                key={title}
                className={`rounded-3xl bg-gradient-to-br p-6 ring-1 transition hover:-translate-y-1 ${tone}`}
              >
                <span className={`inline-flex rounded-2xl p-3 ${iconTone}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{body}</p>
              </li>
            ))}
            <li className="rounded-3xl bg-gradient-to-br from-amber-400/30 to-orange-500/10 p-6 ring-1 ring-amber-300/30 transition hover:-translate-y-1">
              <span className="inline-flex rounded-2xl bg-amber-400/25 p-3 text-amber-200">
                <Gift className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">Rewards</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Turn credits earned by teaching into rewards like gift codes and course coupons.
              </p>
            </li>
          </ul>
        </section>

        {/* Credits */}
        <section id="credits" aria-labelledby="credits-heading" className="scroll-mt-20 px-4 pb-24 sm:px-6">
          <div className="mx-auto grid max-w-6xl items-center gap-10 overflow-hidden rounded-[2rem] border border-amber-300/20 bg-[radial-gradient(ellipse_at_top_left,rgba(251,191,36,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(217,70,239,0.18),transparent_55%)] p-8 sm:p-12 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-300">Credits</p>
              <h2 id="credits-heading" className="mt-3 text-3xl font-bold sm:text-4xl">
                Your time is the currency
              </h2>
              <p className="mt-4 leading-relaxed text-slate-300">
                Not every match is a perfect swap. Teach anyone and earn credits; spend them to learn from someone
                who doesn&apos;t need what you teach.
              </p>
            </div>
            <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                { term: '15 min', detail: 'of teaching earns 1 credit', tone: 'from-amber-300 to-orange-400' },
                { term: 'Free', detail: 'when you swap skills both ways', tone: 'from-emerald-300 to-cyan-400' },
                { term: 'Rewards', detail: 'for the credits you earn teaching', tone: 'from-fuchsia-400 to-violet-500' },
              ].map((item) => (
                <div key={item.term} className="rounded-2xl bg-background/60 p-5 ring-1 ring-white/10 backdrop-blur">
                  <dt className={`bg-gradient-to-r bg-clip-text text-2xl font-extrabold text-transparent ${item.tone}`}>
                    {item.term}
                  </dt>
                  <dd className="mt-1 text-sm text-slate-300">{item.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Final call to action */}
        <section aria-labelledby="cta-heading" className="px-4 pb-24 sm:px-6">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] bg-[linear-gradient(120deg,#f97316,#e11d48,#c026d3,#7c3aed,#0891b2)] bg-[length:200%_200%] p-10 text-center shadow-2xl shadow-fuchsia-950/50 motion-safe:animate-gradient sm:p-14">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.18)_1px,transparent_0)] [background-size:22px_22px] opacity-40"
              aria-hidden="true"
            />
            <h2 id="cta-heading" className="relative text-3xl font-extrabold sm:text-5xl">
              What will you learn first?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-lg text-white/90">
              Create a free account, add a skill you can teach, and see who wants to swap.
            </p>
            <Link
              href="/signup"
              className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-slate-900 shadow-xl transition hover:-translate-y-0.5 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-fuchsia-700"
            >
              Create your free account
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] px-4 py-8 text-center text-sm text-slate-500">
        <p>
          &copy; {new Date().getFullYear()} SkillSwap · Built for learners, by learners.
        </p>
      </footer>
    </div>
  );
}
