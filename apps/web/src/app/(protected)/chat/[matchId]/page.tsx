'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { io, type Socket } from 'socket.io-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarPlus, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, apiBaseURL } from '@/lib/api';
import { formatTime } from '@/lib/format';
import { useMe } from '@/lib/hooks';
import type { ChatMessage, MatchDetail } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const MAX_MESSAGE_LENGTH = 1000;
const MAX_AUTH_RECOVERIES = 3;

export default function ChatPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params);
  const queryClient = useQueryClient();
  const { data: me } = useMe();

  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [typingNames, setTypingNames] = useState<Record<string, string>>({});
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const matchQuery = useQuery({
    queryKey: ['match', matchId],
    queryFn: async () => (await api.get<MatchDetail>(`/matches/${matchId}`)).data,
    retry: false,
  });
  const match = matchQuery.data;
  const canChat = match?.status === 'ACCEPTED';

  const historyQuery = useQuery({
    queryKey: ['chat', matchId],
    queryFn: async () => (await api.get<ChatMessage[]>(`/matches/${matchId}/messages`)).data,
    enabled: canChat,
    retry: false,
    // History is loaded once; new messages arrive over the socket.
    staleTime: Infinity,
    gcTime: 0,
  });

  const messages = useMemo(() => {
    const history = historyQuery.data ?? [];
    const seen = new Set(history.map((message) => message.id));
    return [...history, ...liveMessages.filter((message) => !seen.has(message.id))];
  }, [historyQuery.data, liveMessages]);

  useEffect(() => {
    if (!canChat) return;

    const socket = io(`${apiBaseURL}/chat`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    // The socket authenticates with the short-lived access cookie. When it
    // has expired, any API call refreshes it; then the socket can reconnect.
    let recoveries = 0;
    let recovering = false;
    const recoverSession = async () => {
      if (recovering || recoveries >= MAX_AUTH_RECOVERIES) return;
      recovering = true;
      recoveries += 1;
      try {
        await api.get('/users/me');
        socket.connect();
      } catch {
        // The API client redirects to /login when the session is gone.
      } finally {
        recovering = false;
      }
    };

    socket.on('connect', () => {
      recoveries = 0;
      setIsConnected(true);
      socket.emit('join_room', { matchId });
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      setOnlineIds([]);
      setTypingNames({});
      if (reason === 'io server disconnect') void recoverSession();
    });

    socket.on('connect_error', (error) => {
      setIsConnected(false);
      if (error.message === 'unauthorized') void recoverSession();
    });

    socket.on('receive_message', (message: ChatMessage) => {
      setLiveMessages((current) =>
        current.some((existing) => existing.id === message.id) ? current : [...current, message],
      );
      // Whoever just sent a message has stopped typing.
      setTypingNames((current) => {
        if (!(message.senderId in current)) return current;
        const next = { ...current };
        delete next[message.senderId];
        return next;
      });
    });

    socket.on('typing', ({ userId, name, isTyping }: { userId: string; name: string; isTyping: boolean }) => {
      setTypingNames((current) => {
        const next = { ...current };
        if (isTyping) next[userId] = name;
        else delete next[userId];
        return next;
      });
    });

    socket.on('presence', ({ onlineUsers }: { onlineUsers: { id: string; name: string }[] }) => {
      const ids = onlineUsers.map((user) => user.id);
      setOnlineIds(ids);
      // Someone who left can't still be typing.
      setTypingNames((current) =>
        Object.fromEntries(Object.entries(current).filter(([userId]) => ids.includes(userId))),
      );
    });

    socket.on('exception', (error: { message?: string | string[] }) => {
      const message = Array.isArray(error.message) ? error.message[0] : error.message;
      toast.error(message || 'Message could not be sent');
    });

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.disconnect();
      socketRef.current = null;
      // The inbox shows the latest message per conversation.
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    };
  }, [matchId, canChat, queryClient]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  const handleInput = (value: string) => {
    setDraft(value);
    const socket = socketRef.current;
    if (!socket?.connected) return;

    socket.emit('typing', { matchId, isTyping: value.trim().length > 0 });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { matchId, isTyping: false });
    }, 1500);
  };

  const handleSend = () => {
    const trimmed = draft.trim();
    const socket = socketRef.current;
    if (!trimmed || !socket?.connected) return;

    socket.emit('send_message', { matchId, content: trimmed });
    socket.emit('typing', { matchId, isTyping: false });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setDraft('');
  };

  const partner = match?.partner;
  const partnerOnline = partner ? onlineIds.includes(partner.id) : false;
  const typing = Object.values(typingNames);

  if (matchQuery.isError) {
    return (
      <PageTransition>
        <main className="px-4 py-6 sm:px-6 sm:py-8">
          <section className="mx-auto max-w-3xl glass-card rounded-3xl p-10 text-center" role="alert">
            <p className="text-lg font-semibold text-white">Conversation not found</p>
            <p className="mt-2 text-sm text-slate-400">It may have been removed, or you are not part of it.</p>
            <Link
              href="/chat"
              className="mt-6 inline-flex rounded-xl bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600"
            >
              Back to messages
            </Link>
          </section>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto flex max-w-3xl flex-col glass-card rounded-3xl">
          <header className="flex items-center gap-3 border-b border-white/[0.06] p-4">
            <Link
              href="/chat"
              aria-label="Back to messages"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-300 hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
            {partner ? (
              <>
                <Avatar name={partner.name} src={partner.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-base font-semibold text-white">
                    <Link href={`/users/${partner.id}`} className="hover:underline">
                      {partner.name}
                    </Link>
                  </h1>
                  <p className="flex items-center gap-1.5 text-xs text-slate-400" aria-live="polite">
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        partnerOnline ? 'bg-emerald-400' : 'bg-slate-600',
                      )}
                      aria-hidden="true"
                    />
                    {!canChat
                      ? 'Not connected yet'
                      : !isConnected
                        ? 'Connecting…'
                        : partnerOnline
                          ? 'Online'
                          : 'Offline'}
                  </p>
                </div>
                {canChat ? (
                  <Link
                    href={`/schedule/${matchId}`}
                    className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-purple-700 px-3 text-sm font-medium text-white hover:bg-purple-600"
                  >
                    <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Schedule session</span>
                  </Link>
                ) : null}
              </>
            ) : (
              <div className="skeleton h-10 w-48 rounded-2xl" />
            )}
          </header>

          {match && !canChat ? (
            <div className="p-10 text-center">
              <p className="text-lg font-semibold text-white">You&apos;re not connected yet</p>
              <p className="mt-2 text-sm text-slate-400">
                {match.status === 'PENDING' && match.direction === 'incoming'
                  ? `${match.partner.name} asked to connect. Accept the request to start chatting.`
                  : match.status === 'PENDING'
                    ? `Chat opens as soon as ${match.partner.name} accepts your request.`
                    : 'This connection request was declined.'}
              </p>
              <Link
                href="/matches?tab=requests"
                className="mt-6 inline-flex rounded-xl bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600"
              >
                View requests
              </Link>
            </div>
          ) : (
            <>
              <div
                ref={listRef}
                className="h-[55vh] min-h-[320px] space-y-3 overflow-y-auto p-4"
                role="log"
                aria-label="Messages"
                aria-live="polite"
              >
                {matchQuery.isLoading || historyQuery.isLoading ? (
                  <div className="space-y-3" role="status" aria-label="Loading messages">
                    <div className="skeleton h-12 w-2/3 rounded-2xl" />
                    <div className="skeleton ml-auto h-12 w-1/2 rounded-2xl" />
                    <div className="skeleton h-12 w-3/5 rounded-2xl" />
                  </div>
                ) : historyQuery.isError ? (
                  <p className="p-6 text-center text-sm text-rose-200" role="alert">
                    Unable to load messages. Please refresh the page.
                  </p>
                ) : messages.length === 0 ? (
                  <p className="p-6 text-center text-sm text-slate-400">
                    No messages yet. Say hello and suggest a time for your first session.
                  </p>
                ) : (
                  messages.map((message) => {
                    const mine = message.senderId === me?.id;
                    return (
                      <div key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                        <div
                          className={cn(
                            'max-w-[80%] rounded-2xl px-4 py-2.5',
                            mine
                              ? 'rounded-br-md bg-purple-700 text-white'
                              : 'rounded-bl-md bg-white/[0.07] text-slate-100',
                          )}
                        >
                          <span className="sr-only">{mine ? 'You' : message.senderName}: </span>
                          <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                          <p className={cn('mt-1 text-[11px]', mine ? 'text-purple-200/80' : 'text-slate-500')}>
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <p className="h-5 px-4 text-xs text-slate-400" aria-live="polite">
                {typing.length > 0 ? `${typing.join(', ')} ${typing.length === 1 ? 'is' : 'are'} typing…` : ''}
              </p>

              <form
                className="flex items-center gap-3 border-t border-white/[0.06] p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSend();
                }}
              >
                <label className="sr-only" htmlFor="chatMessage">
                  Message
                </label>
                <Input
                  id="chatMessage"
                  value={draft}
                  onChange={(event) => handleInput(event.target.value)}
                  placeholder={isConnected ? 'Write a message…' : 'Connecting…'}
                  maxLength={MAX_MESSAGE_LENGTH}
                  autoComplete="off"
                  disabled={!canChat}
                  className="h-11 flex-1 rounded-2xl text-white"
                />
                <Button
                  type="submit"
                  disabled={!draft.trim() || !isConnected}
                  aria-label="Send message"
                  className="h-11 rounded-2xl bg-emerald-600 px-4 text-white hover:bg-emerald-500"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Send</span>
                </Button>
              </form>
            </>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
