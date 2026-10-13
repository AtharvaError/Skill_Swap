'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import type { ConnectionDirection, ConnectionStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';

const linkButton =
  'inline-flex h-8 items-center justify-center rounded-lg bg-white/5 px-3 text-sm font-medium text-white transition hover:bg-white/10';

/**
 * The buttons that move a connection forward from wherever it currently is:
 * Connect -> (Request sent | Accept / Decline) -> Chat / Schedule.
 */
export function ConnectionActions({
  userId,
  name,
  matchId,
  status,
  direction,
}: {
  userId: string;
  name: string;
  matchId: string | null;
  status: ConnectionStatus | null;
  direction: ConnectionDirection | null;
}) {
  const queryClient = useQueryClient();

  const refresh = () => {
    for (const key of ['matches', 'requests', 'connections', 'overview', 'user']) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const mutation = useMutation({
    mutationFn: async (action: 'connect' | 'accept' | 'decline' | 'withdraw') => {
      if (action === 'connect') {
        return (await api.post<{ status: ConnectionStatus }>(`/matches/connect/${userId}`)).data.status;
      }
      if (action === 'withdraw') {
        await api.delete(`/matches/${matchId}`);
        return null;
      }
      return (await api.post<{ status: ConnectionStatus }>(`/matches/${matchId}/${action}`)).data.status;
    },
    onSuccess: (newStatus, action) => {
      refresh();
      if (action === 'withdraw') toast.success('Request withdrawn');
      else if (newStatus === 'ACCEPTED') toast.success(`You and ${name} are now connected!`);
      else if (newStatus === 'REJECTED') toast.success('Request declined');
      else toast.success(`Request sent to ${name}`);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Something went wrong. Please try again.'));
    },
  });

  const busy = mutation.isPending;

  if (status === 'ACCEPTED' && matchId) {
    return (
      <div className="flex flex-wrap gap-2">
        <Link href={`/chat/${matchId}`} className={`${linkButton} bg-emerald-600 hover:bg-emerald-500`}>
          Message
        </Link>
        <Link href={`/schedule/${matchId}`} className={linkButton}>
          Schedule session
        </Link>
      </div>
    );
  }

  if (status === 'PENDING' && direction === 'incoming') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => mutation.mutate('accept')}
          disabled={busy}
          className="bg-emerald-600 text-white hover:bg-emerald-500"
          aria-label={`Accept connection request from ${name}`}
        >
          Accept
        </Button>
        <Button
          onClick={() => mutation.mutate('decline')}
          disabled={busy}
          className="bg-white/5 text-white hover:bg-white/10"
          aria-label={`Decline connection request from ${name}`}
        >
          Decline
        </Button>
      </div>
    );
  }

  if (status === 'PENDING') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-1.5 text-sm text-amber-200">
          Request sent
        </span>
        <Button
          onClick={() => mutation.mutate('withdraw')}
          disabled={busy}
          className="bg-white/5 text-white hover:bg-white/10"
          aria-label={`Withdraw connection request to ${name}`}
        >
          Withdraw
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => mutation.mutate('connect')}
      disabled={busy}
      className="bg-emerald-600 text-white hover:bg-emerald-500"
      aria-label={`Send a connection request to ${name}`}
    >
      {busy ? 'Sending…' : 'Connect'}
    </Button>
  );
}
