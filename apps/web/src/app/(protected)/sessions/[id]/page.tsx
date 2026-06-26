'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import DailyIframe from '@daily-co/daily-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';

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
  const callFrameRef = useRef<any>(null);

  // Review states
  const [hoverRating, setHoverRating] = useState(0);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

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

  // Update countdown every second
  useEffect(() => {
    if (!session) return;

    const updateCountdown = () => {
      setCountdown(calculateCountdown(session.scheduledAt, session.durationMinutes));
    };

    updateCountdown(); // Initial call
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [session]);

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

  // Initialize Daily iframe
  useEffect(() => {
    if (!showCall || !session?.meetingLink || callFrameRef.current) return;

    const initDaily = async () => {
      try {
        const callFrame = DailyIframe.createFrame({
          iframeElement: document.getElementById('daily-frame'),
          showLeaveButton: true,
          showFullscreenButton: true,
          layoutConfig: {
            preset: 'default',
          },
        } as any);

        callFrameRef.current = callFrame;

        callFrame.on('joined-meeting', () => {
          console.log('User joined the Daily room');
        });

        callFrame.on('left-meeting', async () => {
          console.log('User left the Daily room');
          setShowCall(false);
          try {
            await api.post(`/sessions/${sessionId}/complete`);
            queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
          } catch (e) {
            console.error('Failed to complete session', e);
          }
          setShowReviewModal(true);
        });

        callFrame.on('error', (error: any) => {
          console.error('Daily iframe error:', error);
        });

        // Join the Daily room
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
      <div className="min-h-screen bg-[#111018] px-6 py-8 text-white">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-lg shadow-slate-900/20">
          <div className="flex items-center justify-center py-20">
            <p className="text-slate-400">Loading session details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !session) {
    return (
      <div className="min-h-screen bg-[#111018] px-6 py-8 text-white">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-lg shadow-slate-900/20">
          <div className="rounded-3xl bg-rose-950/70 p-8 text-center text-rose-200">
            <p>Unable to load session details.</p>
            <Link href="/sessions" className="mt-4 inline-block rounded-2xl bg-purple-700 px-4 py-2 text-white hover:bg-purple-600">
              Back to Sessions
            </Link>
          </div>
        </div>
      </div>
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
    } catch (err: any) {
      setReviewError(err.response?.data?.message || 'Failed to submit review');
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
    <div className="min-h-screen bg-[#111018] px-6 py-8 text-white">
      {showCall && hasDailyRoom ? (
        <div className="fixed inset-0 z-50 bg-black">
          <div id="daily-frame" className="h-full w-full" />
          <button
            onClick={handleExitCall}
            className="absolute right-4 top-4 z-60 rounded-2xl bg-rose-600 px-4 py-2 text-white hover:bg-rose-500"
          >
            Exit Call
          </button>
        </div>
      ) : null}

      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-lg shadow-slate-900/20">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-purple-300">Session Details</p>
            <h1 className="text-3xl font-bold text-white">{participants}</h1>
            <p className="mt-2 text-sm text-slate-400">{sessionStart.toLocaleString()}</p>
          </div>
          <Link href="/sessions" className="rounded-2xl bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">
            Back to Sessions
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-6 space-y-4">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
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
              <div className="rounded-3xl border border-slate-700 bg-slate-900/50 p-6 text-center">
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
              >
                Join Video Call
              </Button>
            ) : session.status === 'COMPLETED' && !hasReviewed ? (
              <Button
                onClick={() => setShowReviewModal(true)}
                className="w-full bg-purple-700 py-6 text-lg font-semibold text-white hover:bg-purple-600"
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
              >
                Complete Session & Leave Review
              </Button>
            ) : (
              <div className="rounded-3xl border border-slate-700 bg-slate-900/50 p-6 text-center">
                <p className="text-sm text-slate-400">
                  {session.status === 'COMPLETED' ? 'Session completed. Thank you for your feedback!' : 'Session hasn\'t started yet. Check back at the scheduled time.'}
                </p>
              </div>
            )}

            <div className="mt-6 space-y-3">
              <h2 className="text-lg font-semibold text-white">Session Details</h2>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm">
                <p className="text-slate-400">Match ID: <span className="text-white font-mono">{session.match.id}</span></p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm">
                <p className="text-slate-400">Participant A: <span className="text-white">{session.match.userA.name}</span></p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm">
                <p className="text-slate-400">Participant B: <span className="text-white">{session.match.userB.name}</span></p>
              </div>
            </div>
          </section>

          <aside className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-white">Quick Info</h2>
              <p className="text-sm text-slate-400">Ready to connect and learn together?</p>
            </div>
            <div className="rounded-3xl bg-slate-950/80 p-4 text-sm text-slate-300">
              <p className="font-semibold text-white">Video Platform</p>
              <p className="mt-2 text-slate-400">
                {hasDailyRoom ? 'Daily.co Prebuilt' : 'Not configured'}
              </p>
            </div>
            <div className="rounded-3xl bg-slate-950/80 p-4 text-sm text-slate-300">
              <p className="font-semibold text-white">Features</p>
              <ul className="mt-2 space-y-1 text-slate-400">
                <li>✓ Camera & Microphone</li>
                <li>✓ Screen Share</li>
                <li>✓ Chat</li>
                <li>✓ Recording Ready</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* Leave Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl shadow-purple-950/20">
            <h2 className="text-2xl font-bold text-white">Leave a Review</h2>
            <p className="mt-2 text-sm text-slate-400">
              Share your feedback about the session. Your review helps other participants and rewards mentors!
            </p>

            <div className="mt-6 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 text-slate-600 transition-colors hover:text-amber-400 focus:outline-none"
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
              <label className="block text-sm font-medium text-slate-300">Comment (optional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-sm text-white outline-none transition focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20"
                placeholder="How was the session? What did you learn?"
              />
            </div>

            {reviewError && (
              <p className="mt-4 text-sm text-rose-400">{reviewError}</p>
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
              >
                Cancel
              </button>
              <button
                onClick={handleReviewSubmit}
                disabled={rating === 0 || isSubmittingReview}
                className="rounded-full bg-purple-700 px-6 py-3 text-sm font-semibold text-white hover:bg-purple-600 disabled:opacity-50"
              >
                {isSubmittingReview ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
