'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { api } from '@/lib/api';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data;
    },
    retry: false,
  });

  useEffect(() => {
    if (isError) {
      router.push('/login');
    }
  }, [isError, router]);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  if (isError || !user) {
    return null; // Will redirect
  }

  return <>{children}</>;
}
