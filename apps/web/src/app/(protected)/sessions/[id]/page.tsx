'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import DailyIframe from '@daily-co/daily-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarPlus, Coins, ExternalLink, Star, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { formatDateTime, googleCalendarLink } from '@/lib/format';
import { useMe, useNow } from '@/lib/hooks';
import type { Session } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import PageTransition from '@/components/PageTransition';
import { Stars } from '@/components/Rating';
import { Button } from '@/components/ui/button';

// The room opens a little early so both people can check their setup.
const JOIN_EARLY_MS = 10 * 60 * 1000;
// In a paid lesson the learner confirms it to release the payment. The
// teacher may do so only after this long past the end (enforced by the API).
const TEACHER_CONFIRM_GRACE_MS = 24 * 60 * 60 * 1000;

const credits = (count: number) => `${count} credit${count === 1 ? '' : 's'}`;

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  return `${hours}h ${minutes}m ${seconds}s`;
}

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  const queryClient = useQueryClient();
  const now = useNow(1000);
  const { data: me } = useMe();

  const [showCall, setShowCall] = useState(false);
  const callFrameRef = useRef<ReturnType<typeof DailyIframe.createFrame> | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const reviewModalRef = useRef<HTMLDivElement>(null);

  const { data: session, isLoading, isError } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => (await api.get<Session>(`/sessions/${sessionId}`)).data,
    retry: false,
  });

  const refresh = () => {
    for (const key of ['sessions', 'overview', 'me', 'leaderboard', 'connections', 'credits', 'rewards']) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const completeMutation = useMutation({
    mutationFn: async () => (await api.post<Session>(`/sessions/${sessionId}/complete`)).data,
    onSuccess: (updated) => {
      queryClient.setQueryData(['session', sessionId], updated);
      refresh();
      if (!updated.hasReviewed) setShowReviewModal(true);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Could not mark the session as complete'));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => (await api.post<Session>(`/sessions/${sessionId}/cancel`)).data,
    onSuccess: (updated) => {
      queryClient.setQueryData(['session', sessionId], updated);
      refresh();
      setConfirmingCancel(false);
      toast.success('Session cancelled');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Could not cancel the session'));
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/sessions/${sessionId}/review`, { rating, comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      refresh();
      closeReviewModal();
      toast.success('Review submitted. Thank you!');
    },
    onError: (error: unknown) => {
      const message = getApiErrorMessage(error, 'Failed to submit review');
      setReviewError(message);
      toast.error(message);
    },
  });

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setRating(0);
    setHoverRating(0);
    setComment('');
    setReviewError('');
  };

  useEffect(() => {
    if (showReviewModal) reviewModalRef.current?.focus();
  }, [showReviewModal]);

  const meetingLink = session?.meetingLink ?? null;
  const isDailyRoom = Boolean(meetingLink?.includes('daily.co'));
  const { mutate: completeSession } = completeMutation;
  const isTeacher = session?.role === 'teacher';

  // Embedded Daily call. Leaving the call offers to wrap the session up.
  useEffect(() => {
    if (!showCall || !meetingLink || !isDailyRoom || callFrameRef.current) return;

    const container = document.getElementById('daily-frame');
    if (!(container instanceof HTMLDivElement)) return;

    const callFrame = DailyIframe.createFrame(container, {
      showLeaveButton: true,
      showFullscreenButton: true,
      iframeStyle: { width: '100%', height: '100%', border: '0' },
    });
    callFrameRef.current = callFrame;

    callFrame.on('left-meeting', () => {
      setShowCall(false);
      // A paid lesson is confirmed by the learner, not by the teacher leaving.
      if (!isTeacher) completeSession();
    });
    callFrame.on('error', () => {
      toast.error('The video call ran into a problem. Try joining again.');
      setShowCall(false);
    });
    callFrame.join({ url: meetingLink }).catch(() => {
      toast.error('Could not join the video call.');
      setShowCall(false);
    });

    return () => {
      void callFrame.destroy();
      callFrameRef.current = null;
    };
  }, [showCall, meetingLink, isDailyRoom, completeSession, isTeacher]);

  if (isLoading) {
    return (
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-4xl space-y-6" role="status" aria-label="Loading session">
          <div className="skeleton h-10 w-72" />
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <div className="skeleton h-80 rounded-3xl" />
            <div className="skeleton h-48 rounded-3xl" />
          </div>
        </div>
      </main>
    );
  }

  if (isError || !session) {
    return (
      <PageTransition>
        <main className="px-4 py-6 sm:px-6 sm:py-8">
          <section className="mx-auto max-w-3xl glass-card rounded-3xl p-10 text-center" role="alert">
            <p className="text-lg font-semibold text-white">Session not found</p>
            <p className="mt-2 text-sm text-slate-400">It may have been removed, or you are not part of it.</p>
            <Link
              href="/sessions"
              className="mt-6 inline-flex rounded-xl bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600"
            >
              Back to sessions
            </Link>
          </section>
        </main>
      </PageTransition>
    );
  }

  const partner = session.partner;
  const partnerFirstName = partner.name.split(' ')[0];
  const start = new Date(session.scheduledAt).getTime();
  const end = start + session.durationMinutes * 60000;
  const isScheduled = session.status === 'SCHEDULED';
  const hasStarted = now >= start;
  const hasEnded = now >= end;
  const canJoin = isScheduled && Boolean(meetingLink) && now >= start - JOIN_EARLY_MS && !hasEnded;
  const title = session.topic ?? 'SkillSwap session';
  const teacherMustWait = isTeacher && now < end + TEACHER_CONFIRM_GRACE_MS;
  const cost = credits(session.creditCost);
  const lessonNote =
    session.role === 'learner'
      ? session.status === 'SCHEDULED'
        ? `Paid lesson: ${cost} held from your balance. ${partnerFirstName} receives them when you confirm the lesson happened.`
        : session.status === 'COMPLETED'
          ? `You paid ${partnerFirstName} ${cost} for this lesson.`
          : `Your ${cost} were refunded.`
      : session.role === 'teacher'
        ? session.status === 'SCHEDULED'
          ? `Paid lesson: you earn ${cost} when ${partnerFirstName} confirms it happened.`
          : session.status === 'COMPLETED'
            ? `You earned ${cost} for teaching this lesson.`
            : `${partnerFirstName}'s ${cost} were refunded.`
        : null;

  const statusLabel =
    session.status === 'CANCELLED'
      ? 'Cancelled'
      : session.status === 'COMPLETED'
        ? 'Completed'
        : hasEnded
          ? 'Ended — waiting to be marked complete'
          : hasStarted
            ? 'Happening now'
            : `Starts in ${formatCountdown(start - now)}`;

  return (
    <PageTransition>
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        {showCall && isDailyRoom ? (
          <div className="fixed inset-0 z-50 bg-black" role="dialog" aria-modal="true" aria-label="Video call">
            <div id="daily-frame" className="h-full w-full" />
          </div>
        ) : null}

        <div className="mx-auto max-w-4xl space-y-6">
          <Link href="/sessions" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All sessions
          </Link>

          <header className="flex items-center gap-4">
            <Avatar name={partner.name} src={partner.avatarUrl} size="lg" />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-white sm:text-3xl">{title}</h1>
              <p className="text-sm text-slate-400">
                with{' '}
                <Link href={`/users/${partner.id}`} className="text-slate-200 hover:underline">
                  {partner.name}
                </Link>{' '}
                · {formatDateTime(session.scheduledAt)} · {session.durationMinutes} min
              </p>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <section className="glass-card space-y-5 rounded-3xl p-6" aria-label="Session">
              <div
                className={cn(
                  'rounded-2xl border p-5',
                  session.status === 'CANCELLED'
                    ? 'border-white/10 bg-white/[0.03]'
                    : session.status === 'COMPLETED'
                      ? 'border-purple-500/40 bg-purple-950/30'
                      : hasStarted && !hasEnded
                        ? 'border-emerald-500/50 bg-emerald-950/30'
                        : 'border-amber-500/40 bg-amber-950/20',
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Status</p>
                <p className="mt-2 font-mono text-xl font-semibold text-white" aria-live="off">
                  {statusLabel}
                </p>
              </div>

              {lessonNote ? (
                <p className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-100">
                  <Coins className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {lessonNote}
                </p>
              ) : null}

              {session.notes ? (
                <div>
                  <h2 className="text-sm font-semibold text-white">Notes</h2>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{session.notes}</p>
                </div>
              ) : null}

              {isScheduled ? (
                <div className="space-y-3">
                  {canJoin && isDailyRoom ? (
                    <Button
                      onClick={() => setShowCall(true)}
                      className="h-12 w-full rounded-2xl bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-500"
                    >
                      <Video className="h-5 w-5" aria-hidden="true" />
                      Join video call
                    </Button>
                  ) : canJoin && meetingLink ? (
                    <a
                      href={meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-500"
                    >
                      <Video className="h-5 w-5" aria-hidden="true" />
                      Join video call
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ) : !hasEnded ? (
                    <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-slate-400">
                      The video room opens 10 minutes before the start time.
                    </p>
                  ) : null}

                  {hasStarted && teacherMustWait ? (
                    <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                      {partnerFirstName} confirms this lesson to release your {cost}. If they haven&apos;t done so 24
                      hours after it ends, you can confirm it here yourself.
                    </p>
                  ) : null}

                  {hasStarted && !teacherMustWait ? (
                    <Button
                      onClick={() => completeSession()}
                      disabled={completeMutation.isPending}
                      className="h-11 w-full rounded-2xl bg-purple-700 text-white hover:bg-purple-600"
                    >
                      {completeMutation.isPending
                        ? 'Saving…'
                        : session.role === 'learner'
                          ? `Confirm lesson and pay ${cost}`
                          : 'Mark as complete and review'}
                    </Button>
                  ) : confirmingCancel ? (
                    <div
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4"
                      role="alertdialog"
                      aria-label="Cancel session"
                    >
                      <p className="text-sm text-rose-100">
                        Cancel this session for both of you?
                        {session.role ? ` The held ${cost} will be refunded.` : ''}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => cancelMutation.mutate()}
                          disabled={cancelMutation.isPending}
                          className="bg-rose-600 text-white hover:bg-rose-500"
                        >
                          {cancelMutation.isPending ? 'Cancelling…' : 'Yes, cancel'}
                        </Button>
                        <Button
                          onClick={() => setConfirmingCancel(false)}
                          className="bg-white/10 text-white hover:bg-white/20"
                        >
                          Keep it
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setConfirmingCancel(true)}
                      className="h-11 w-full rounded-2xl bg-white/5 text-slate-200 hover:bg-white/10"
                    >
                      {hasStarted && isTeacher ? `Cancel and refund ${partnerFirstName}` : 'Cancel session'}
                    </Button>
                  )}
                </div>
              ) : session.status === 'COMPLETED' && !session.hasReviewed ? (
                <Button
                  onClick={() => setShowReviewModal(true)}
                  className="h-12 w-full rounded-2xl bg-purple-700 text-base font-semibold text-white hover:bg-purple-600"
                >
                  Leave a review for {partnerFirstName}
                </Button>
              ) : session.status === 'CANCELLED' ? (
                <p className="text-sm text-slate-400">
                  This session was cancelled.{' '}
                  <Link href={`/schedule/${session.matchId}`} className="text-purple-300 hover:underline">
                    Schedule a new one
                  </Link>
                  .
                </p>
              ) : null}

              {session.reviews.length > 0 ? (
                <div>
                  <h2 className="text-sm font-semibold text-white">Reviews</h2>
                  <ul className="mt-2 space-y-3">
                    {session.reviews.map((review) => (
                      <li key={review.id} className="rounded-2xl bg-white/[0.04] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-slate-200">
                            {review.reviewerId === me?.id ? 'Your review' : `${partnerFirstName}'s review of you`}
                          </p>
                          <Stars rating={review.rating} />
                        </div>
                        {review.comment ? <p className="mt-2 text-sm text-slate-300">{review.comment}</p> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>

            <aside className="glass-card h-fit space-y-3 rounded-3xl p-6" aria-label="Session links">
              <h2 className="text-lg font-semibold text-white">Before you meet</h2>
              <Link
                href={`/chat/${session.matchId}`}
                className="flex items-center justify-center rounded-xl bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10"
              >
                Message {partnerFirstName}
              </Link>
              {isScheduled ? (
                <a
                  href={
                    session.googleHtmlLink ??
                    googleCalendarLink({
                      title: `SkillSwap: ${title} with ${partner.name}`,
                      start: session.scheduledAt,
                      durationMinutes: session.durationMinutes,
                      details: session.notes ?? undefined,
                      location: meetingLink,
                    })
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10"
                >
                  <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                  {session.googleHtmlLink ? 'Open calendar event' : 'Add to Google Calendar'}
                </a>
              ) : null}
              <p className="pt-2 text-xs leading-relaxed text-slate-500">
                {isDailyRoom
                  ? 'Video runs inside SkillSwap, with screen sharing and chat.'
                  : 'Video opens in a new tab.'}
              </p>
            </aside>
          </div>
        </div>

        {showReviewModal ? (
          <div
            ref={reviewModalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-title"
            onKeyDown={(event) => {
              if (event.key === 'Escape') closeReviewModal();
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm outline-none"
          >
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[oklch(0.16_0.02_280)] p-6 shadow-2xl">
              <h2 id="review-title" className="text-2xl font-bold text-white">
                How was your session?
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Your rating appears on {partnerFirstName}&apos;s profile and counts towards their badges.
              </p>

              <div className="mt-6 flex justify-center gap-2" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="rounded-lg p-1 focus-visible:ring-2 focus-visible:ring-purple-500 focus:outline-none"
                    aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    role="radio"
                    aria-checked={rating === star}
                  >
                    <Star
                      aria-hidden="true"
                      className={cn(
                        'h-8 w-8 transition-colors',
                        star <= (hoverRating || rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-600',
                      )}
                    />
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <label htmlFor="review-comment" className="block text-sm font-medium text-slate-300">
                  Comment (optional)
                </label>
                <textarea
                  id="review-comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={4}
                  maxLength={1000}
                  className="mt-2 w-full rounded-2xl border border-input bg-input/30 p-3 text-sm text-white outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  placeholder="What did you learn? What went well?"
                />
              </div>

              {reviewError ? (
                <p className="mt-4 text-sm text-rose-400" role="alert">
                  {reviewError}
                </p>
              ) : null}

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeReviewModal}
                  className="rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={() => reviewMutation.mutate()}
                  disabled={rating === 0 || reviewMutation.isPending}
                  className="rounded-xl bg-purple-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-purple-600 disabled:opacity-50"
                >
                  {reviewMutation.isPending ? 'Submitting…' : 'Submit review'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </PageTransition>
  );
}
