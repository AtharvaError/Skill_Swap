'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import DailyIframe from '@daily-co/daily-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import PageTransition, { SlideUp } from '@/components/PageTransition';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '@/lib/errors';

interface Session {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingLink?: string;
  status: string;
  match: {
    id: string;
    userA: { id: string; name: string; email: string };
    userB: { id: string; name: string; email: string };
  };
  reviews?: Array<{
    id: string;
    reviewerId: string;
    revieweeId: string;
    rating: number;
    comment?: string;
  }>;
}

interface CountdownState {
  isStarted: boolean;
  hasEnded: boolean;
  timeLeft: string;
}

function calculateCountdown(scheduledAt: string, durationMinutes: number): CountdownState {
  const now = new Date();
  const sessionStart = new Date(scheduledAt);
  const sessionEnd = new Date(sessionStart.getTime() + durationMinutes * 60000);

  if (now >= sessionEnd) {
    return { isStarted: true, hasEnded: true, timeLeft: 'Session ended' };
  }

  if (now >= sessionStart) {
    return { isStarted: true, hasEnded: false, timeLeft: 'In progress' };
  }

  const diffMs = sessionStart.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return {
    isStarted: false,
    hasEnded: false,
    timeLeft: `${hours}h ${minutes}m ${seconds}s`,
  };
}

export default function SessionDetailPage({ params }: { params: { id: string } }) {
  const { id: sessionId } = params;
  const queryClient = useQueryClient();
  const [countdown, setCountdown] = useState<CountdownState | null>(null);
  const [showCall, setShowCall] = useState(false);
  const callFrameRef = useRef<ReturnType<typeof DailyIframe.createFrame> | null>(null);

  const [hoverRating, setHoverRating] = useState(0);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const reviewModalRef = useRef<HTMLDivElement>(null);

  const { data: session, isLoading, isError } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const res = await api.get(`/sessions/${sessionId}`);
      return res.data as Session;
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data;
    },
  });

  useEffect(() => {
    if (!session) return;

    const updateCountdown = () => {
      setCountdown(calculateCountdown(session.scheduledAt, session.durationMinutes));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (showReviewModal && reviewModalRef.current) {
      reviewModalRef.current.focus();
    }
  }, [showReviewModal]);

  const handleExitCall = async () => {
    setShowCall(false);
    try {
      await api.post(`/sessions/${sessionId}/complete`);
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
    } catch (e) {
      console.error('Failed to complete session', e);
    }
    setShowReviewModal(true);
  };

  useEffect(() => {
    if (!showCall || !session?.meetingLink || callFrameRef.current) return;

    const initDaily = async () => {
      try {
        const iframeElement = document.getElementById('daily-frame');
        if (!(iframeElement instanceof HTMLDivElement)) {
          throw new Error('Daily iframe container not found');
        }

        const callFrame = DailyIframe.createFrame(iframeElement, {
          showLeaveButton: true,
          showFullscreenButton: true,
        });

        callFrameRef.current = callFrame;

        callFrame.on('left-meeting', async () => {
          setShowCall(false);
          try {
            await api.post(`/sessions/${sessionId}/complete`);
            queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
          } catch (e) {
            console.error('Failed to complete session', e);
          }
          setShowReviewModal(true);
        });

        callFrame.on('error', (error: unknown) => {
          console.error('Daily iframe error:', error);
        });

        await callFrame.join({ url: session.meetingLink });
      } catch (error) {
        console.error('Failed to initialize Daily iframe:', error);
      }
    };

    initDaily();

    return () => {
      if (callFrameRef.current) {
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }
    };
  }, [showCall, session?.meetingLink, sessionId, queryClient]);

  if (isLoading) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-background px-4 py-6 text-white sm:px-6 sm:py-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="skeleton h-4 w-24 rounded" />
                <div className="skeleton h-8 w-64 rounded" />
              </div>
              <div className="skeleton h-9 w-36 rounded-2xl" />
            </div>
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="skeleton h-96 w-full rounded-3xl" />
              <div className="skeleton h-48 w-full rounded-3xl" />
            </div>
          </div>
        </main>
      </PageTransition>
    );
  }

  if (isError || !session) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-background px-4 py-6 text-white sm:px-6 sm:py-8">
          <div className="mx-auto max-w-6xl rounded-3xl border border-slate-800 glass-card p-6 shadow-lg shadow-slate-900/20">
            <section className="rounded-3xl bg-rose-950/70 p-8 text-center text-rose-200" role="alert">
              <p>Unable to load session details.</p>
              <Link href="/sessions" aria-label="Back to sessions list" className="mt-4 inline-block rounded-2xl bg-purple-700 px-4 py-2 text-white hover:bg-purple-600">
                Back to Sessions
              </Link>
            </section>
          </div>
        </main>
      </PageTransition>
    );
  }

  const handleReviewSubmit = async () => {
    setIsSubmittingReview(true);
    setReviewError('');
    try {
      await api.post(`/sessions/${sessionId}/review`, { rating, comment });
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setShowReviewModal(false);
      setRating(0);
      setComment('');
      toast.success('Review submitted!');
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Failed to submit review');
      setReviewError(msg);
      toast.error(msg);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const participants = `${session.match.userA.name} & ${session.match.userB.name}`;
  const sessionStart = new Date(session.scheduledAt);
  const hasDailyRoom = !!session.meetingLink?.includes('daily.co');
  const canJoinCall = countdown?.isStarted && !countdown?.hasEnded && hasDailyRoom;
  const hasReviewed = session.reviews?.some((r) => r.reviewerId === currentUser?.id);

  return (
    <PageTransition>
      <main className="min-h-screen bg-background px-4 py-6 text-white sm:px-6 sm:py-8">
        {showCall && hasDailyRoom ? (
          <div className="fixed inset-0 z-50 bg-black">
            <div id="daily-frame" className="h-full w-full" />
            <button
              onClick={handleExitCall}
              className="absolute right-4 top-4 z-60 rounded-2xl bg-rose-600 px-4 py-2 text-white hover:bg-rose-500"
              aria-label="Exit video call"
            >
              Exit Call
            </button>
          </div>
        ) : null}

        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-800 glass-card p-6 shadow-lg shadow-slate-900/20">
          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-purple-300">Session Details</p>
              <h1 className="text-3xl font-bold text-white">{participants}</h1>
              <p className="mt-2 text-sm text-slate-400">{sessionStart.toLocaleString()}</p>
            </div>
            <Link href="/sessions" aria-label="Back to sessions list" className="rounded-2xl bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">
              Back to Sessions
            </Link>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <SlideUp>
              <section className="rounded-3xl border border-slate-800 glass p-6">
                <div className="mb-6 space-y-4">
                  <div className="rounded-3xl border border-slate-800 glass p-5">
                    <p className="text-sm uppercase tracking-[0.26em] text-slate-500">Session Status</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{session.status}</p>
                    <p className="mt-1 text-sm text-slate-400">Duration: {session.durationMinutes} minutes</p>
                  </div>

                  {countdown ? (
                    <div className={`rounded-3xl border p-5 ${countdown.isStarted && !countdown.hasEnded ? 'border-emerald-500/50 bg-emerald-950/30' : 'border-amber-500/50 bg-amber-950/30'}`}>
                      <p className="text-sm uppercase tracking-[0.26em] text-slate-400">
                        {countdown.isStarted && !countdown.hasEnded ? 'Session Status' : 'Time Until Start'}
                      </p>
                      <p className={`mt-2 text-2xl font-semibold font-mono ${countdown.isStarted && !countdown.hasEnded ? 'text-emerald-300' : 'text-amber-300'}`}>
                        {countdown.timeLeft}
                      </p>
                    </div>
                  ) : null}
                </div>

                {!hasDailyRoom ? (
                  <div className="rounded-3xl border border-slate-700 glass p-6 text-center">
                    <p className="text-sm text-slate-400">
                      Daily video calling is not configured for this session.
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Ensure the Daily.co API key is configured in your environment.
                    </p>
                  </div>
                ) : canJoinCall ? (
                  <Button
                    onClick={() => setShowCall(true)}
                    className="w-full bg-emerald-600 py-6 text-lg font-semibold text-white hover:bg-emerald-500"
                    aria-label="Join video call session"
                  >
                    Join Video Call
                  </Button>
                ) : session.status === 'COMPLETED' && !hasReviewed ? (
                  <Button
                    onClick={() => setShowReviewModal(true)}
                    className="w-full bg-purple-700 py-6 text-lg font-semibold text-white hover:bg-purple-600"
                    aria-label="Leave a review for this session"
                  >
                    Leave a Review
                  </Button>
                ) : session.status === 'SCHEDULED' && countdown?.hasEnded ? (
                  <Button
                    onClick={async () => {
                      try {
                        await api.post(`/sessions/${sessionId}/complete`);
                        queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
                        setShowReviewModal(true);
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="w-full bg-emerald-600 py-6 text-lg font-semibold text-white hover:bg-emerald-500"
                    aria-label="Complete session and leave review"
                  >
                    Complete Session & Leave Review
                  </Button>
                ) : (
                  <div className="rounded-3xl border border-slate-700 glass p-6 text-center">
                    <p className="text-sm text-slate-400">
                      {session.status === 'COMPLETED' ? 'Session completed. Thank you for your feedback!' : 'Session hasn\'t started yet. Check back at the scheduled time.'}
                    </p>
                  </div>
                )}

                <div className="mt-6 space-y-3">
                  <h2 className="text-lg font-semibold text-white">Session Details</h2>
                  <div className="rounded-2xl border border-slate-800 glass p-4 text-sm">
                    <p className="text-slate-400">Match ID: <span className="text-white font-mono">{session.match.id}</span></p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 glass p-4 text-sm">
                    <p className="text-slate-400">Participant A: <span className="text-white">{session.match.userA.name}</span></p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 glass p-4 text-sm">
                    <p className="text-slate-400">Participant B: <span className="text-white">{session.match.userB.name}</span></p>
                  </div>
                </div>
              </section>
            </SlideUp>

            <SlideUp>
              <aside className="space-y-4 rounded-3xl border border-slate-800 glass p-6">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-white">Quick Info</h2>
                  <p className="text-sm text-slate-400">Ready to connect and learn together?</p>
                </div>
                <div className="rounded-3xl glass p-4 text-sm text-slate-300">
                  <p className="font-semibold text-white">Video Platform</p>
                  <p className="mt-2 text-slate-400">
                    {hasDailyRoom ? 'Daily.co Prebuilt' : 'Not configured'}
                  </p>
                </div>
                <div className="rounded-3xl glass p-4 text-sm text-slate-300">
                  <p className="font-semibold text-white">Features</p>
                  <ul className="mt-2 space-y-1 text-slate-400">
                    <li>✓ Camera & Microphone</li>
                    <li>✓ Screen Share</li>
                    <li>✓ Chat</li>
                    <li>✓ Recording Ready</li>
                  </ul>
                </div>
              </aside>
            </SlideUp>
          </div>
        </div>

        {showReviewModal && (
          <div
            ref={reviewModalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-title"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowReviewModal(false);
                setRating(0);
                setComment('');
                setReviewError('');
              }
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <div className="w-full max-w-md rounded-3xl border border-slate-800 glass-card p-6 shadow-2xl shadow-purple-950/20">
              <h2 id="review-title" className="text-2xl font-bold text-white">Leave a Review</h2>
              <p className="mt-2 text-sm text-slate-400">
                Share your feedback about the session. Your review helps other participants and rewards mentors!
              </p>

              <div className="mt-6 flex justify-center gap-2" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-slate-600 transition-colors hover:text-amber-400 focus-visible:ring-2 focus-visible:ring-purple-500 focus:outline-none"
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    role="radio"
                    aria-checked={star <= rating}
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= (hoverRating || rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <label htmlFor="review-comment" className="block text-sm font-medium text-slate-300">Comment (optional)</label>
                <textarea
                  id="review-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-slate-800 glass p-4 text-sm text-white outline-none transition focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20"
                  placeholder="How was the session? What did you learn?"
                />
              </div>

              {reviewError && (
                <p className="mt-4 text-sm text-rose-400" role="alert">{reviewError}</p>
              )}

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setRating(0);
                    setComment('');
                    setReviewError('');
                  }}
                  className="rounded-full bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
                  aria-label="Cancel review"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReviewSubmit}
                  disabled={rating === 0 || isSubmittingReview}
                  className="rounded-full bg-purple-700 px-6 py-3 text-sm font-semibold text-white hover:bg-purple-600 disabled:opacity-50"
                  aria-label="Submit review"
                >
                  {isSubmittingReview ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </PageTransition>
  );
}
