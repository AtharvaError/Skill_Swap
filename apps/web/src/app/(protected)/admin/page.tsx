'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { useDebounced, useMe } from '@/lib/hooks';
import type {
  AdminRedemption,
  AdminReport,
  AdminReward,
  AdminSummary,
  AdminUser,
  ReportReason,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import PageTransition from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const REASON_LABELS: Record<ReportReason, string> = {
  SPAM: 'Spam',
  HARASSMENT: 'Harassment',
  INAPPROPRIATE: 'Inappropriate content',
  NO_SHOW: 'Missed sessions',
  OTHER: 'Other',
};

const TABS = [
  { key: 'reports', label: 'Reports' },
  { key: 'rewards', label: 'Reward requests' },
  { key: 'catalogue', label: 'Catalogue' },
  { key: 'users', label: 'Users' },
] as const;
type Tab = (typeof TABS)[number]['key'];

/** Runs an admin action, then refreshes every admin list and the summary. */
function useAdminAction<T>(action: (input: T) => Promise<unknown>, success: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast.success(success);
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'That did not work')),
  });
}

function SuspendedBadge() {
  return (
    <span className="rounded-full bg-rose-950/60 px-2 py-0.5 text-[11px] font-semibold text-rose-200 ring-1 ring-rose-500/30">
      Suspended
    </span>
  );
}

function ReportsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: async () => (await api.get<AdminReport[]>('/admin/reports')).data,
  });
  const resolve = useAdminAction(
    ({ id, status }: { id: string; status: 'RESOLVED' | 'DISMISSED' }) =>
      api.post(`/admin/reports/${id}/resolve`, { status }),
    'Report closed',
  );
  const suspend = useAdminAction((userId: string) => api.post(`/admin/users/${userId}/suspend`), 'Account suspended');

  if (isLoading) return <div className="skeleton h-40 rounded-3xl" role="status" aria-label="Loading reports" />;
  if (!data?.length) return <p className="glass-card rounded-3xl p-8 text-center text-slate-400">No open reports.</p>;

  return (
    <ul className="space-y-3">
      {data.map((report) => (
        <li key={report.id} className="glass-card rounded-3xl p-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-amber-950/50 px-2.5 py-0.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-500/30">
              {REASON_LABELS[report.reason]}
            </span>
            <span className="text-slate-500">{formatDateTime(report.createdAt)}</span>
          </div>
          <p className="mt-3 text-sm text-slate-300">
            <span className="font-medium text-white">{report.reporter.name}</span> reported{' '}
            <span className="font-medium text-white">{report.reported.name}</span>{' '}
            <span className="text-slate-500">({report.reported.email})</span>
            {report.reported._count.reportsReceived > 1 ? (
              <span className="text-rose-300"> · {report.reported._count.reportsReceived} reports in total</span>
            ) : null}
            {report.reported.suspendedAt ? (
              <>
                {' '}
                <SuspendedBadge />
              </>
            ) : null}
          </p>
          {report.details ? (
            <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-white/[0.04] p-3 text-sm text-slate-300">
              {report.details}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={() => resolve.mutate({ id: report.id, status: 'RESOLVED' })}
              disabled={resolve.isPending}
              className="bg-emerald-600 text-white hover:bg-emerald-500"
            >
              Mark resolved
            </Button>
            <Button
              onClick={() => resolve.mutate({ id: report.id, status: 'DISMISSED' })}
              disabled={resolve.isPending}
              className="bg-white/5 text-white hover:bg-white/10"
            >
              Dismiss
            </Button>
            {!report.reported.suspendedAt ? (
              <Button
                onClick={() => suspend.mutate(report.reported.id)}
                disabled={suspend.isPending}
                className="bg-rose-700 text-white hover:bg-rose-600"
              >
                Suspend {report.reported.name.split(' ')[0]}
              </Button>
            ) : null}
            {!report.reported.suspendedAt ? (
              <Link
                href={`/users/${report.reported.id}`}
                className="inline-flex h-8 items-center rounded-lg px-2.5 text-sm text-purple-300 hover:bg-white/5"
              >
                View profile
              </Link>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function RedemptionRow({ redemption }: { redemption: AdminRedemption }) {
  const [note, setNote] = useState('');
  const fulfil = useAdminAction(
    () => api.post(`/admin/redemptions/${redemption.id}/fulfil`, { note }),
    'Request fulfilled',
  );
  const reject = useAdminAction(
    () => api.post(`/admin/redemptions/${redemption.id}/reject`),
    'Request rejected and refunded',
  );
  const busy = fulfil.isPending || reject.isPending;

  return (
    <li className="glass-card rounded-3xl p-5">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={redemption.user.name} src={redemption.user.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {redemption.title} · {redemption.cost} credits
          </p>
          <p className="truncate text-xs text-slate-400">
            {redemption.user.name} ({redemption.user.email}) · {formatDateTime(redemption.createdAt)}
          </p>
        </div>
      </div>
      <form
        className="mt-4 flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          fulfil.mutate(undefined);
        }}
      >
        <label htmlFor={`note-${redemption.id}`} className="sr-only">
          Note for {redemption.user.name}
        </label>
        <Input
          id={`note-${redemption.id}`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
          placeholder="Code or instructions for the member (optional)"
          className="h-8 min-w-[220px] flex-1"
        />
        <Button type="submit" disabled={busy} className="bg-emerald-600 text-white hover:bg-emerald-500">
          Fulfil
        </Button>
        <Button
          type="button"
          onClick={() => reject.mutate(undefined)}
          disabled={busy}
          className="bg-white/5 text-white hover:bg-white/10"
        >
          Reject and refund
        </Button>
      </form>
    </li>
  );
}

function RewardsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'redemptions'],
    queryFn: async () => (await api.get<AdminRedemption[]>('/admin/redemptions')).data,
  });

  if (isLoading) return <div className="skeleton h-40 rounded-3xl" role="status" aria-label="Loading requests" />;
  if (!data?.length) {
    return <p className="glass-card rounded-3xl p-8 text-center text-slate-400">No pending reward requests.</p>;
  }
  return (
    <ul className="space-y-3">
      {data.map((redemption) => (
        <RedemptionRow key={redemption.id} redemption={redemption} />
      ))}
    </ul>
  );
}

type RewardForm = { title: string; category: string; description: string; cost: string; stock: string };

const toForm = (reward?: AdminReward): RewardForm => ({
  title: reward?.title ?? '',
  category: reward?.category ?? '',
  description: reward?.description ?? '',
  cost: reward ? String(reward.cost) : '',
  stock: reward?.stock === null || reward?.stock === undefined ? '' : String(reward.stock),
});

/** Blank stock means unlimited. */
const fromForm = (form: RewardForm) => ({
  title: form.title,
  category: form.category,
  description: form.description,
  cost: Number(form.cost),
  stock: form.stock.trim() === '' ? null : Number(form.stock),
});

function RewardFields({ form, onChange, idPrefix }: { form: RewardForm; onChange: (form: RewardForm) => void; idPrefix: string }) {
  const field = (key: keyof RewardForm) => ({
    id: `${idPrefix}-${key}`,
    value: form[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...form, [key]: event.target.value }),
  });
  const label = (key: keyof RewardForm, text: string) => (
    <label htmlFor={`${idPrefix}-${key}`} className="text-xs text-slate-400">
      {text}
    </label>
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        {label('title', 'Title')}
        <Input required maxLength={80} className="h-9" {...field('title')} />
      </div>
      <div className="space-y-1">
        {label('category', 'Category')}
        <Input required maxLength={40} className="h-9" {...field('category')} />
      </div>
      <div className="space-y-1 sm:col-span-2">
        {label('description', 'Description')}
        <textarea
          required
          maxLength={300}
          rows={2}
          className="w-full rounded-lg border border-input bg-input/30 p-2 text-sm text-white outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          {...field('description')}
        />
      </div>
      <div className="space-y-1">
        {label('cost', 'Cost (credits)')}
        <Input required type="number" min={1} max={100000} className="h-9" {...field('cost')} />
      </div>
      <div className="space-y-1">
        {label('stock', 'Stock (blank for unlimited)')}
        <Input type="number" min={0} max={1000000} className="h-9" {...field('stock')} />
      </div>
    </div>
  );
}

function CatalogueRow({ reward }: { reward: AdminReward }) {
  const [form, setForm] = useState(() => toForm(reward));
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(reward));
  const save = useAdminAction(
    (changes: Record<string, unknown>) => api.patch(`/admin/rewards/${reward.id}`, changes),
    'Reward updated',
  );

  return (
    <li className={cn('glass-card rounded-3xl p-5', !reward.active && 'opacity-60')}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate(fromForm(form));
        }}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          {reward.active ? null : (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 font-semibold text-slate-300">Hidden</span>
          )}
          <span>
            Redeemed {reward.redeemed} time{reward.redeemed === 1 ? '' : 's'}
          </span>
        </div>
        <RewardFields form={form} onChange={setForm} idPrefix={`reward-${reward.id}`} />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit" disabled={!dirty || save.isPending} className="bg-emerald-600 text-white hover:bg-emerald-500">
            Save changes
          </Button>
          <Button
            type="button"
            onClick={() => save.mutate({ active: !reward.active })}
            disabled={save.isPending}
            className="bg-white/5 text-white hover:bg-white/10"
          >
            {reward.active ? 'Hide from members' : 'Show to members'}
          </Button>
        </div>
      </form>
    </li>
  );
}

function CatalogueTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'rewards'],
    queryFn: async () => (await api.get<AdminReward[]>('/admin/rewards')).data,
  });
  const [draft, setDraft] = useState(() => toForm());
  const create = useAdminAction(async () => {
    await api.post('/admin/rewards', fromForm(draft));
    setDraft(toForm());
  }, 'Reward added');

  return (
    <div className="space-y-6">
      <form
        className="glass-card space-y-4 rounded-3xl p-5"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate(undefined);
        }}
      >
        <h2 className="text-lg font-semibold text-white">Add a reward</h2>
        <RewardFields form={draft} onChange={setDraft} idPrefix="new-reward" />
        <Button type="submit" disabled={create.isPending} className="bg-purple-700 text-white hover:bg-purple-600">
          {create.isPending ? 'Adding…' : 'Add reward'}
        </Button>
      </form>

      {isLoading ? (
        <div className="skeleton h-40 rounded-3xl" role="status" aria-label="Loading rewards" />
      ) : (
        <ul className="space-y-3">
          {data?.map((reward) => (
            // Keyed on updatedAt so the form resets to saved values after each save.
            <CatalogueRow key={`${reward.id}-${reward.updatedAt}`} reward={reward} />
          ))}
        </ul>
      )}
    </div>
  );
}

function UsersTab() {
  const [search, setSearch] = useState('');
  const query = useDebounced(search.trim(), 300);
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', query],
    queryFn: async () => (await api.get<AdminUser[]>('/admin/users', { params: query ? { q: query } : undefined })).data,
    placeholderData: (previous) => previous,
  });
  const setSuspended = useAdminAction(
    ({ id, suspend }: { id: string; suspend: boolean }) =>
      api.post(`/admin/users/${id}/${suspend ? 'suspend' : 'unsuspend'}`),
    'Account updated',
  );

  return (
    <div className="space-y-4">
      <Input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by name or email"
        aria-label="Search users"
        className="h-11 rounded-2xl"
      />
      {isLoading ? (
        <div className="skeleton h-40 rounded-3xl" role="status" aria-label="Loading users" />
      ) : !data?.length ? (
        <p className="glass-card rounded-3xl p-8 text-center text-slate-400">No users found.</p>
      ) : (
        <ul className="space-y-2">
          {data.map((user) => (
            <li key={user.id} className="glass-card flex flex-wrap items-center gap-3 rounded-2xl p-3">
              <Avatar name={user.name} src={user.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-white">
                  {user.name}
                  {user.isAdmin ? (
                    <span className="rounded-full bg-purple-700 px-2 py-0.5 text-[11px] font-semibold">Admin</span>
                  ) : null}
                  {user.suspendedAt ? <SuspendedBadge /> : null}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {user.email} · {user.credits} credits · joined {new Date(user.createdAt).toLocaleDateString()}
                  {user.reportCount > 0 ? (
                    <span className="text-rose-300">
                      {' '}
                      · {user.reportCount} report{user.reportCount === 1 ? '' : 's'}
                    </span>
                  ) : null}
                </p>
              </div>
              {user.isAdmin ? null : (
                <Button
                  onClick={() => setSuspended.mutate({ id: user.id, suspend: !user.suspendedAt })}
                  disabled={setSuspended.isPending}
                  className={cn(
                    'text-white',
                    user.suspendedAt ? 'bg-white/5 hover:bg-white/10' : 'bg-rose-700 hover:bg-rose-600',
                  )}
                >
                  {user.suspendedAt ? 'Unsuspend' : 'Suspend'}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { data: me } = useMe();
  const [tab, setTab] = useState<Tab>('reports');
  const isAdmin = Boolean(me?.isAdmin);

  const { data: summary } = useQuery({
    queryKey: ['admin', 'summary'],
    queryFn: async () => (await api.get<AdminSummary>('/admin/summary')).data,
    enabled: isAdmin,
  });

  if (me && !isAdmin) {
    return (
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <section className="mx-auto max-w-3xl glass-card rounded-3xl p-10 text-center" role="alert">
          <p className="text-lg font-semibold text-white">Admins only</p>
          <p className="mt-2 text-sm text-slate-400">You don&apos;t have access to this page.</p>
        </section>
      </main>
    );
  }

  const counts: Partial<Record<Tab, number>> = {
    reports: summary?.openReports,
    rewards: summary?.pendingRedemptions,
  };

  return (
    <PageTransition>
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <header>
            <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.3em] text-purple-300">
              <Shield className="h-4 w-4" aria-hidden="true" />
              Admin
            </p>
            <h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl">Moderation and rewards</h1>
            {summary ? (
              <p className="mt-2 text-sm text-slate-400">
                {summary.users} members · {summary.suspendedUsers} suspended · {summary.openReports} open report
                {summary.openReports === 1 ? '' : 's'} · {summary.pendingRedemptions} pending reward request
                {summary.pendingRedemptions === 1 ? '' : 's'}
              </p>
            ) : null}
          </header>

          <div className="flex gap-1 rounded-2xl bg-white/[0.04] p-1" role="tablist" aria-label="Admin sections">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="tab"
                id={`admin-tab-${key}`}
                aria-selected={tab === key}
                aria-controls="admin-panel"
                onClick={() => setTab(key)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
                  tab === key ? 'bg-purple-700 text-white' : 'text-slate-400 hover:text-white',
                )}
              >
                {label}
                {counts[key] ? (
                  <span className="rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-black">{counts[key]}</span>
                ) : null}
              </button>
            ))}
          </div>

          <div id="admin-panel" role="tabpanel" aria-labelledby={`admin-tab-${tab}`}>
            {!isAdmin ? (
              <div className="skeleton h-40 rounded-3xl" role="status" aria-label="Loading" />
            ) : tab === 'reports' ? (
              <ReportsTab />
            ) : tab === 'rewards' ? (
              <RewardsTab />
            ) : tab === 'catalogue' ? (
              <CatalogueTab />
            ) : (
              <UsersTab />
            )}
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
