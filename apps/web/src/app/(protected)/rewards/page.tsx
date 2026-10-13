'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins, Gift, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import type { Redemption, Reward, RewardsOverview, Wallet } from '@/lib/types';
import { cn } from '@/lib/utils';
import PageTransition from '@/components/PageTransition';
import { Button } from '@/components/ui/button';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

const REDEMPTION_STATUS: Record<Redemption['status'], { label: string; tone: string }> = {
  PENDING: { label: 'Pending', tone: 'bg-amber-950/50 text-amber-200 ring-amber-500/30' },
  FULFILLED: { label: 'Fulfilled', tone: 'bg-emerald-950/60 text-emerald-300 ring-emerald-500/30' },
  CANCELLED: { label: 'Cancelled', tone: 'bg-slate-900/80 text-slate-400 ring-white/10' },
};

function WalletFigure({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] p-4">
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-1 text-2xl font-bold text-white">{value}</dd>
      <dd className="mt-1 text-xs text-slate-500">{hint}</dd>
    </div>
  );
}

function RewardCard({
  reward,
  redeemable,
  onRedeemed,
}: {
  reward: Reward;
  redeemable: number;
  onRedeemed: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const shortBy = reward.cost - redeemable;

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post(`/rewards/${reward.id}/redeem`);
    },
    onSuccess: () => {
      setConfirming(false);
      onRedeemed();
      toast.success(`Request recorded for ${reward.title}`);
    },
    onError: (error: unknown) => {
      setConfirming(false);
      toast.error(getApiErrorMessage(error, 'Could not redeem this reward'));
    },
  });

  return (
    <li className="glass-card flex flex-col rounded-3xl p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">{reward.category}</p>
      <h3 className="mt-2 text-lg font-semibold text-white">{reward.title}</h3>
      <p className="mt-1 flex-1 text-sm text-slate-400">{reward.description}</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-300">
          <Coins className="h-4 w-4" aria-hidden="true" />
          {plural(reward.cost, 'credit')}
        </span>

        {shortBy > 0 ? (
          <span className="text-xs text-slate-500">Teach {plural(shortBy, 'more credit')} to unlock</span>
        ) : confirming ? (
          <span className="flex items-center gap-2">
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="bg-emerald-600 text-white hover:bg-emerald-500"
            >
              {mutation.isPending ? 'Redeeming…' : `Spend ${reward.cost}`}
            </Button>
            <Button
              onClick={() => setConfirming(false)}
              disabled={mutation.isPending}
              className="bg-white/5 text-white hover:bg-white/10"
            >
              Keep credits
            </Button>
          </span>
        ) : (
          <Button
            onClick={() => setConfirming(true)}
            className="bg-purple-700 text-white hover:bg-purple-600"
            aria-label={`Redeem ${reward.title} for ${plural(reward.cost, 'credit')}`}
          >
            Redeem
          </Button>
        )}
      </div>
    </li>
  );
}

export default function RewardsPage() {
  const queryClient = useQueryClient();

  const walletQuery = useQuery({
    queryKey: ['credits'],
    queryFn: async () => (await api.get<Wallet>('/credits')).data,
  });
  const rewardsQuery = useQuery({
    queryKey: ['rewards'],
    queryFn: async () => (await api.get<RewardsOverview>('/rewards')).data,
  });

  const refresh = () => {
    for (const key of ['credits', 'rewards', 'me', 'overview']) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const cancelMutation = useMutation({
    mutationFn: async (redemptionId: string) => {
      await api.post(`/rewards/redemptions/${redemptionId}/cancel`);
    },
    onSuccess: () => {
      refresh();
      toast.success('Request cancelled and credits refunded');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Could not cancel this request'));
    },
  });

  const wallet = walletQuery.data;
  const rewards = rewardsQuery.data;

  if (walletQuery.isLoading || rewardsQuery.isLoading) {
    return (
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl space-y-6" role="status" aria-label="Loading rewards">
          <div className="skeleton h-10 w-72" />
          <div className="skeleton h-36 rounded-3xl" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="skeleton h-44 rounded-3xl" />
            <div className="skeleton h-44 rounded-3xl" />
          </div>
        </div>
      </main>
    );
  }

  if (!wallet || !rewards) {
    return (
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <section className="mx-auto max-w-3xl glass-card rounded-3xl p-10 text-center text-rose-200" role="alert">
          We couldn&apos;t load your credits. Please refresh the page.
        </section>
      </main>
    );
  }

  const { rules } = wallet;
  const creditsPerHour = 60 / rules.minutesPerCredit;
  const bonusOnly = wallet.balance - wallet.redeemable;

  return (
    <PageTransition>
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl space-y-8">
          <header>
            <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.3em] text-purple-300">
              <Gift className="h-4 w-4" aria-hidden="true" />
              Rewards
            </p>
            <h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl">Credits and rewards</h1>
            <p className="mt-2 text-sm text-slate-400">
              Earn credits by teaching, spend them on lessons, and redeem what you&apos;ve earned for rewards.
            </p>
          </header>

          <section className="glass-card rounded-3xl p-6" aria-labelledby="wallet-heading">
            <h2 id="wallet-heading" className="sr-only">
              Your wallet
            </h2>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Balance</p>
                <p className="mt-1 flex items-center gap-3 text-5xl font-bold text-white">
                  <Coins className="h-9 w-9 text-amber-300" aria-hidden="true" />
                  {wallet.balance}
                  <span className="text-base font-medium text-slate-400">credits</span>
                </p>
              </div>
              <Link
                href="/matches?tab=connections"
                className="inline-flex h-9 items-center rounded-lg bg-purple-700 px-4 text-sm font-medium text-white hover:bg-purple-600"
              >
                Book a lesson
              </Link>
            </div>

            <dl className="mt-6 grid gap-3 sm:grid-cols-3">
              <WalletFigure
                label="Redeemable"
                value={wallet.redeemable}
                hint="Earned by teaching. Can be exchanged for rewards."
              />
              <WalletFigure
                label="Held"
                value={wallet.held}
                hint="Already paid for lessons you've booked. Refunded if cancelled."
              />
              <WalletFigure
                label="Incoming"
                value={wallet.incoming}
                hint="Yours once the lessons you're teaching are confirmed."
              />
            </dl>

            {bonusOnly > 0 ? (
              <p className="mt-4 flex items-start gap-2 text-xs text-slate-400">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Your balance includes {plural(bonusOnly, 'bonus credit')}. Bonus credits pay for lessons but
                can&apos;t be redeemed.
              </p>
            ) : null}
          </section>

          <section aria-labelledby="catalog-heading" className="space-y-4">
            <h2 id="catalog-heading" className="text-xl font-semibold text-white">
              Rewards
            </h2>
            {rewards.preview ? (
              <p className="rounded-2xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
                <span className="font-semibold">Preview.</span> Rewards aren&apos;t being issued yet. Redeeming
                records a pending request and holds the credits; you can cancel it at any time for a full refund.
              </p>
            ) : null}
            <ul className="grid gap-4 sm:grid-cols-2">
              {rewards.catalog.map((reward) => (
                <RewardCard key={reward.id} reward={reward} redeemable={wallet.redeemable} onRedeemed={refresh} />
              ))}
            </ul>
          </section>

          {rewards.redemptions.length > 0 ? (
            <section aria-labelledby="redemptions-heading" className="space-y-4">
              <h2 id="redemptions-heading" className="text-xl font-semibold text-white">
                Your requests
              </h2>
              <ul className="space-y-3">
                {rewards.redemptions.map((redemption) => {
                  const status = REDEMPTION_STATUS[redemption.status];
                  return (
                    <li
                      key={redemption.id}
                      className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-3xl p-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{redemption.title}</p>
                        <p className="text-sm text-slate-400">
                          {plural(redemption.cost, 'credit')} · {formatDateTime(redemption.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn('rounded-full px-3 py-1 text-xs font-semibold ring-1', status.tone)}>
                          {status.label}
                        </span>
                        {redemption.status === 'PENDING' ? (
                          <Button
                            onClick={() => cancelMutation.mutate(redemption.id)}
                            disabled={cancelMutation.isPending}
                            className="bg-white/5 text-white hover:bg-white/10"
                            aria-label={`Cancel request for ${redemption.title} and refund credits`}
                          >
                            Cancel and refund
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="glass-card rounded-3xl p-6" aria-labelledby="history-heading">
              <h2 id="history-heading" className="text-xl font-semibold text-white">
                History
              </h2>
              {wallet.transactions.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">No credit activity yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-white/[0.06]">
                  {wallet.transactions.map((transaction) => (
                    <li key={transaction.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-slate-200">{transaction.description}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(transaction.createdAt)}</p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 font-mono text-sm font-semibold',
                          transaction.amount > 0 ? 'text-emerald-300' : 'text-slate-400',
                        )}
                      >
                        {transaction.amount > 0 ? `+${transaction.amount}` : `−${Math.abs(transaction.amount)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <aside className="glass-card h-fit rounded-3xl p-6" aria-labelledby="earn-heading">
              <h2 id="earn-heading" className="text-xl font-semibold text-white">
                How credits work
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                {[
                  ['Teach a lesson', `+${creditsPerHour} per hour`],
                  ['Take a lesson', `−${creditsPerHour} per hour`],
                  ['Skill swap', 'Free'],
                  ['Joining SkillSwap', `+${rules.signupBonus}`],
                  ['First Swap badge', `+${rules.badgeBonuses.firstSwap}`],
                  ['Five-star review', `+${rules.fiveStarReviewBonus}`],
                  ['Verified skill badge', `+${rules.badgeBonuses.verifiedSkill}`],
                  ['Mentor or Top Rated badge', `+${rules.badgeBonuses.mentor}`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <dt className="text-slate-300">{label}</dt>
                    <dd className="font-mono font-semibold text-white">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-slate-500">
                When you book a lesson, its cost is held and goes to your teacher once you confirm the lesson
                happened.
              </p>
            </aside>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
