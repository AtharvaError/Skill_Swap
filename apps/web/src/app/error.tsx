'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-white">
      <div className="glass-card max-w-md rounded-3xl p-10 text-center" role="alert">
        <h1 className="text-3xl font-bold">Something went wrong</h1>
        <p className="mt-3 text-sm text-slate-400">
          The page hit an unexpected error. Your data is safe; try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex rounded-xl bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
