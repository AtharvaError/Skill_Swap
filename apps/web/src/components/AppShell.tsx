'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Calendar, Coins, LayoutDashboard, LogOut, MessageSquare, Trophy, Users, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useMe } from '@/lib/hooks';
import type { ConnectionRequests } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/matches', label: 'Discover', icon: Users },
  { href: '/chat', label: 'Messages', icon: MessageSquare },
  { href: '/sessions', label: 'Sessions', icon: Calendar },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

/** Navigation chrome shared by every signed-in page. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();

  const { data: requests } = useQuery({
    queryKey: ['requests'],
    queryFn: async () => (await api.get<ConnectionRequests>('/matches/requests')).data,
    refetchInterval: 30000,
  });
  const pendingCount = requests?.incoming.length ?? 0;

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Even if the request fails, leave the signed-in area.
    }
    queryClient.clear();
    toast.success('Signed out');
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-background text-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-purple-700 focus:px-4 focus:py-2"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="SkillSwap dashboard">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-700 shadow-lg shadow-purple-900/40">
              <Zap className="h-4 w-4 text-white" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold tracking-tight">SkillSwap</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
                    active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/rewards"
              aria-current={isActive(pathname, '/rewards') ? 'page' : undefined}
              aria-label={`${me?.credits ?? 0} credits. Open rewards`}
              className={cn(
                'flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold transition hover:bg-white/5',
                isActive(pathname, '/rewards') ? 'bg-white/10 text-amber-200' : 'text-amber-300',
              )}
            >
              <Coins className="h-4 w-4" aria-hidden="true" />
              {me?.credits ?? 0}
            </Link>
            <Link
              href="/matches?tab=requests"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/5 hover:text-white"
              aria-label={
                pendingCount > 0
                  ? `${pendingCount} pending connection request${pendingCount === 1 ? '' : 's'}`
                  : 'Connection requests'
              }
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {pendingCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              ) : null}
            </Link>
            <Link
              href="/profile"
              aria-label="Your profile"
              aria-current={isActive(pathname, '/profile') ? 'page' : undefined}
              className="flex items-center gap-2 rounded-xl p-1 pr-2 transition hover:bg-white/5"
            >
              <Avatar name={me?.name ?? '?'} src={me?.avatarUrl} size="sm" />
              <span className="hidden max-w-[120px] truncate text-sm font-medium text-slate-200 sm:block">
                {me?.name?.split(' ')[0]}
              </span>
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/5 hover:text-white"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div id="main-content" className="pb-24 md:pb-10">
        {children}
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-background/90 backdrop-blur-xl md:hidden"
        aria-label="Main"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition',
                    active ? 'text-purple-300' : 'text-slate-500 hover:text-slate-200',
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
