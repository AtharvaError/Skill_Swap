'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban, Flag } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import type { ReportReason } from '@/lib/types';
import { Button } from '@/components/ui/button';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'SPAM', label: 'Spam or advertising' },
  { value: 'HARASSMENT', label: 'Harassment or abuse' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate content' },
  { value: 'NO_SHOW', label: 'Repeatedly missed sessions' },
  { value: 'OTHER', label: 'Something else' },
];

// Everything that can change when someone is blocked or unblocked.
const AFFECTED_QUERIES = ['user', 'matches', 'connections', 'requests', 'sessions', 'overview', 'credits', 'me', 'blocks'];

/** Report and block controls for another member's profile. */
export function SafetyActions({ userId, name, blocked }: { userId: string; name: string; blocked: boolean }) {
  const queryClient = useQueryClient();
  const [panel, setPanel] = useState<'none' | 'report' | 'block'>('none');
  const [reason, setReason] = useState<ReportReason>('SPAM');
  const [details, setDetails] = useState('');
  const firstName = name.split(' ')[0];

  const refresh = () => {
    for (const key of AFFECTED_QUERIES) queryClient.invalidateQueries({ queryKey: [key] });
  };

  const report = useMutation({
    mutationFn: async () => {
      await api.post(`/users/${userId}/report`, { reason, details });
    },
    onSuccess: () => {
      setPanel('none');
      setDetails('');
      toast.success('Thanks. Our team will review your report.');
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Could not send the report')),
  });

  const block = useMutation({
    mutationFn: async (shouldBlock: boolean) => {
      if (shouldBlock) await api.post(`/users/${userId}/block`);
      else await api.delete(`/users/${userId}/block`);
      return shouldBlock;
    },
    onSuccess: (shouldBlock) => {
      setPanel('none');
      refresh();
      toast.success(shouldBlock ? `${firstName} is blocked` : `${firstName} is unblocked`);
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Something went wrong')),
  });

  return (
    <div className="mt-5 border-t border-white/[0.06] pt-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPanel(panel === 'report' ? 'none' : 'report')}
          aria-expanded={panel === 'report'}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
        >
          <Flag className="h-3.5 w-3.5" aria-hidden="true" />
          Report
        </button>
        {blocked ? (
          <button
            type="button"
            onClick={() => block.mutate(false)}
            disabled={block.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <Ban className="h-3.5 w-3.5" aria-hidden="true" />
            Unblock
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPanel(panel === 'block' ? 'none' : 'block')}
            aria-expanded={panel === 'block'}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/5 hover:text-rose-300"
          >
            <Ban className="h-3.5 w-3.5" aria-hidden="true" />
            Block
          </button>
        )}
      </div>

      {panel === 'block' ? (
        <div className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4" role="alertdialog" aria-label={`Block ${name}`}>
          <p className="text-sm text-rose-100">
            Block {firstName}? You&apos;ll stop seeing each other in Discover, your connection ends, and any upcoming
            sessions are cancelled with credits refunded. {firstName} isn&apos;t told.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              onClick={() => block.mutate(true)}
              disabled={block.isPending}
              className="bg-rose-600 text-white hover:bg-rose-500"
            >
              {block.isPending ? 'Blocking…' : `Block ${firstName}`}
            </Button>
            <Button onClick={() => setPanel('none')} className="bg-white/10 text-white hover:bg-white/20">
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {panel === 'report' ? (
        <form
          className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          onSubmit={(event) => {
            event.preventDefault();
            report.mutate();
          }}
        >
          <fieldset>
            <legend className="text-sm font-medium text-white">What&apos;s wrong?</legend>
            <div className="mt-2 grid gap-1.5">
              {REASONS.map((option) => (
                <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <input
                    type="radio"
                    name="report-reason"
                    value={option.value}
                    checked={reason === option.value}
                    onChange={() => setReason(option.value)}
                    className="accent-purple-500"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="report-details" className="text-sm text-slate-300">
              Details (optional)
            </label>
            <textarea
              id="report-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={1000}
              rows={3}
              className="mt-1 w-full rounded-lg border border-input bg-input/30 p-2.5 text-sm text-white outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="What happened? This is only seen by the SkillSwap team."
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={report.isPending} className="bg-purple-700 text-white hover:bg-purple-600">
              {report.isPending ? 'Sending…' : 'Send report'}
            </Button>
            <Button type="button" onClick={() => setPanel('none')} className="bg-white/10 text-white hover:bg-white/20">
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
