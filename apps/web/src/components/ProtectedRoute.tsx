'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { api } from '@/lib/api';
import type { Me } from '@/lib/types';

function LoadingSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Loading">
      <div className="glass-card flex flex-col items-center gap-4 rounded-3xl p-8">
        <div className="skeleton h-12 w-12 rounded-full" />
        <div className="skeleton h-4 w-48" />
        <div className="skeleton h-3 w-32" />
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get<Me>('/users/me')).data,
    retry: false,
  });

  useEffect(() => {
    if (isError) {
      router.replace('/login');
    }
  }, [isError, router]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !user) {
    return null;
  }

  return <>{children}</>;
}
