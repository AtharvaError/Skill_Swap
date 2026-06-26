'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { io, type Socket } from 'socket.io-client';
import DOMPurify from 'dompurify';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageTransition } from '@/components/PageTransition';
import toast from 'react-hot-toast';

type ChatMessage = {
  id: string;
  matchId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
};

export default function ChatPage({ params }: { params: { matchId: string } }) {
  const { matchId } = params;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { data: initialMessages, isLoading, isError } = useQuery({
    queryKey: ['chat', matchId],
    queryFn: async () => {
      const res = await api.get(`/matches/${matchId}/messages`);
      return res.data as ChatMessage[];
    },
    enabled: !!matchId,
    retry: false,
  });

  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    if (!matchId) return;

    const socket = io('http://localhost:3001/chat', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join_room', { matchId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('receive_message', (message: ChatMessage) => {
      setMessages((current) => [...current, message]);
    });

    socket.on('typing', ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      setTypingUsers((current) => {
        if (isTyping) {
          return current.includes(userId) ? current : [...current, userId];
        }
        return current.filter((id) => id !== userId);
      });
    });

    socket.on('presence', ({ onlineUsers }: { onlineUsers: string[] }) => {
      setOnlineUsers(onlineUsers);
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
      toast.error('Connection lost. Trying to reconnect...');
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [matchId]);

  useEffect(() => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const displayTyping = useMemo(() => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return `${typingUsers[0]} is typing...`;
    return `${typingUsers.length} people are typing...`;
  }, [typingUsers]);

  const handleInput = (value: string) => {
    setDraft(value);
    const socket = socketRef.current;
    if (!socket) return;

    socket.emit('typing', { matchId, isTyping: value.trim().length > 0 });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { matchId, isTyping: false });
    }, 1000);
  };

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed || !socketRef.current) return;

    socketRef.current.emit('send_message', { matchId, content: trimmed });
    setDraft('');
    socketRef.current.emit('typing', { matchId, isTyping: false });
  };

  const sanitizedHtml = (text: string) => ({ __html: DOMPurify.sanitize(text).replace(/\n/g, '<br/>') });

  return (
    <PageTransition>
      <main className="min-h-screen bg-background px-6 py-8 text-white">
        <div className="mx-auto max-w-5xl glass-card rounded-3xl p-6 shadow-lg">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">SkillSwap Chat</h1>
              <p className="mt-2 text-sm text-slate-400">Live chat for your accepted match.</p>
            </div>
            <nav className="flex flex-wrap gap-3">
              <Link
                href="/matches"
                aria-label="Back to matches"
                className="rounded-2xl bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
              >
                Back to Matches
              </Link>
              <Button
                onClick={() => window.location.assign(`/schedule/${matchId}`)}
                aria-label="Schedule a quick session"
                className="rounded-2xl bg-purple-700 px-4 py-2 text-sm text-white hover:bg-purple-600"
              >
                Schedule Quick Session
              </Button>
            </nav>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <section className="glass-card rounded-3xl p-6" aria-label="Chat messages">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.26em] text-slate-500">Match Chat</p>
                  <p className="mt-1 text-xs text-slate-400">Match ID: {matchId}</p>
                </div>
                <div className="rounded-full bg-slate-800 px-3 py-1 text-xs text-emerald-300">
                  {isConnected ? 'Connected' : 'Connecting...'}
                </div>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                <span>{onlineUsers.length} online</span>
                {displayTyping ? <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-200">{displayTyping}</span> : null}
              </div>

              <div className="glass rounded-3xl p-4 text-sm leading-6 text-slate-200" style={{ maxHeight: '520px', overflowY: 'auto' }}>
                {isLoading ? (
                  <div className="space-y-3" aria-label="Loading messages">
                    <div className="skeleton h-12 rounded-2xl" />
                    <div className="skeleton h-12 rounded-2xl" />
                    <div className="skeleton h-12 rounded-2xl" />
                  </div>
                ) : isError ? (
                  <div className="glass rounded-3xl p-5 text-slate-300">Unable to load messages. Please refresh the page.</div>
                ) : messages.length === 0 ? (
                  <div className="glass rounded-3xl p-5 text-slate-300">No messages yet. Send the first message to start the conversation.</div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="glass rounded-3xl border border-slate-800 p-4 mb-3">
                      <div className="mb-2 flex items-center justify-between gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                        <span>{message.senderName}</span>
                        <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-slate-100" dangerouslySetInnerHTML={sanitizedHtml(message.content)} />
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
                onSubmit={(event) => { event.preventDefault(); handleSend(); }}
              >
                <label className="sr-only" htmlFor="chatMessage">Type your message</label>
                <Input
                  id="chatMessage"
                  value={draft}
                  onChange={(event) => handleInput(event.target.value)}
                  placeholder="Write a safe message..."
                  aria-label="Chat message input"
                  className="min-h-[54px] flex-1 glass text-white"
                />
                <Button
                  type="submit"
                  disabled={!draft.trim()}
                  aria-label="Send message"
                  className="min-h-[54px] bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  Send
                </Button>
              </form>
            </section>

            <aside className="glass-card rounded-3xl p-6 space-y-4" aria-label="Chat controls">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-white">Chat controls</h2>
                <p className="text-sm text-slate-400">Use the typing indicator and online presence to keep your conversation active.</p>
              </div>
              <div className="glass rounded-3xl p-4 text-sm text-slate-300">
                <p className="mb-2 text-xs uppercase tracking-[0.22em] text-slate-500">Active participants</p>
                {onlineUsers.length > 0 ? (
                  onlineUsers.map((user) => (
                    <div key={user} className="rounded-2xl bg-slate-800 px-3 py-2 text-white">{user}</div>
                  ))
                ) : (
                  <p className="text-slate-500">No one else is currently online.</p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
