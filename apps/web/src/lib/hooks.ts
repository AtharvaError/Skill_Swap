'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Me } from '@/lib/types';

/** The signed-in user. Shares its cache entry with ProtectedRoute. */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get<Me>('/users/me')).data,
  });
}

/**
 * The current time as state, refreshed on an interval. Reading the clock
 * through this keeps renders pure and time-dependent UI up to date.
 */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return now;
}

/** Returns `value` after it has stopped changing for `delayMs`. */
export function useDebounced<T>(value: T, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
