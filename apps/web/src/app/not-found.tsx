import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-white">
      <div className="glass-card max-w-md rounded-3xl p-10 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-purple-300">404</p>
        <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
        <p className="mt-3 text-sm text-slate-400">That page doesn&apos;t exist or has moved.</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-xl bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
