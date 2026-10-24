'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '@base-ui/react/dialog';
import { Award } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, apiBaseURL } from '@/lib/api';
import { AVAILABILITY_DAYS, AVAILABILITY_PERIODS, slotKey } from '@/lib/availability';
import { getApiErrorMessage } from '@/lib/errors';
import { useMe } from '@/lib/hooks';
import type { Me, OfferedSkill, UserSummary, WantedSkill } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import PageTransition, { SlideUp } from '@/components/PageTransition';
import { Rating } from '@/components/Rating';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const PROFICIENCY_OPTIONS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'EXPERT', label: 'Expert' },
];

const dialogBackdrop = 'fixed inset-0 z-50 bg-black/70 backdrop-blur-sm';
const dialogPopup =
  'fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(92vw,540px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/10 bg-[oklch(0.16_0.02_280)] p-6 shadow-2xl shadow-black/50';
const dialogClose = 'rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10';

function EditProfileDialog({
  user,
  open,
  onOpenChange,
}: {
  user: Me;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: user.name,
    bio: user.bio ?? '',
    college: user.college ?? '',
    avatarUrl: user.avatarUrl ?? '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async () => (await api.patch<Me>('/users/me', form)).data,
    onSuccess: (data) => {
      queryClient.setQueryData(['me'], data);
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      onOpenChange(false);
      toast.success('Profile updated!');
    },
    onError: (err: unknown) => {
      const message = getApiErrorMessage(err, 'Could not save profile');
      setError(message);
      toast.error(message);
    },
  });

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((previous) => ({ ...previous, [key]: event.target.value })),
  });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={dialogBackdrop} />
        <Dialog.Popup className={dialogPopup}>
          <Dialog.Title className="text-xl font-semibold text-white">Edit profile</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-slate-400">
            This is what other people see when they find you.
          </Dialog.Description>
          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!form.name.trim()) {
                setError('Name is required');
                return;
              }
              mutation.mutate();
            }}
          >
            <div>
              <label htmlFor="profile-name" className="block text-sm text-slate-300">
                Name
              </label>
              <Input id="profile-name" required maxLength={100} className="mt-1 h-10" {...field('name')} />
            </div>
            <div>
              <label htmlFor="profile-bio" className="block text-sm text-slate-300">
                Bio
              </label>
              <textarea
                id="profile-bio"
                maxLength={500}
                rows={4}
                className="mt-1 w-full rounded-lg border border-input bg-input/30 p-2.5 text-sm text-white outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="What do you love teaching? What are you hoping to learn?"
                {...field('bio')}
              />
            </div>
            <div>
              <label htmlFor="profile-college" className="block text-sm text-slate-300">
                College or school
              </label>
              <Input id="profile-college" maxLength={200} className="mt-1 h-10" {...field('college')} />
            </div>
            <div>
              <label htmlFor="profile-avatar" className="block text-sm text-slate-300">
                Photo URL (optional)
              </label>
              <Input
                id="profile-avatar"
                type="url"
                inputMode="url"
                placeholder="https://…"
                className="mt-1 h-10"
                {...field('avatarUrl')}
              />
            </div>
            {error ? (
              <p className="text-sm text-rose-300" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Dialog.Close className={dialogClose}>Cancel</Dialog.Close>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="h-9 bg-purple-600 px-4 text-white hover:bg-purple-500"
              >
                {mutation.isPending ? 'Saving…' : 'Save profile'}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AddSkillDialog({
  kind,
  open,
  onOpenChange,
}: {
  kind: 'offered' | 'wanted';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ name: string; category: string } | null>(null);
  const [proficiency, setProficiency] = useState('INTERMEDIATE');
  const [error, setError] = useState('');

  const catalogQuery = useQuery({
    queryKey: ['skills', 'catalog'],
    queryFn: async () => (await api.get<Record<string, string[]>>('/skills/catalog')).data,
    staleTime: Infinity,
  });

  const suggestions = useMemo(() => {
    const items = Object.entries(catalogQuery.data ?? {}).flatMap(([category, names]) =>
      names.map((name) => ({ category, name })),
    );
    const query = search.trim().toLowerCase();
    if (!query) return items.slice(0, 6);
    return items
      .filter((item) => item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query))
      .slice(0, 6);
  }, [catalogQuery.data, search]);

  const mutation = useMutation({
    mutationFn: async () => {
      const name = selected?.name ?? search.trim();
      await api.post(`/skills/${kind}`, {
        name,
        category: selected?.category,
        ...(kind === 'offered' ? { proficiency } : {}),
      });
    },
    onSuccess: () => {
      for (const key of [['skills', kind], ['overview'], ['matches']]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      onOpenChange(false);
      toast.success('Skill added!');
    },
    onError: (err: unknown) => {
      const message = getApiErrorMessage(err, 'Could not add skill');
      setError(message);
      toast.error(message);
    },
  });

  const offered = kind === 'offered';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={dialogBackdrop} />
        <Dialog.Popup className={dialogPopup}>
          <Dialog.Title className="text-xl font-semibold text-white">
            {offered ? 'Add a skill you can teach' : 'Add a skill you want to learn'}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-slate-400">
            Pick from the list or type your own.
          </Dialog.Description>
          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!(selected?.name ?? search.trim())) {
                setError('Enter a skill name');
                return;
              }
              mutation.mutate();
            }}
          >
            <div>
              <label htmlFor={`${kind}-skill-name`} className="block text-sm text-slate-300">
                Skill
              </label>
              <Input
                id={`${kind}-skill-name`}
                value={search}
                maxLength={60}
                autoComplete="off"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSelected(null);
                  setError('');
                }}
                placeholder={offered ? 'e.g. Python, UI Design, Guitar' : 'e.g. Public Speaking, Figma, Piano'}
                className="mt-1 h-10"
              />
            </div>

            {suggestions.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Suggested skills">
                {suggestions.map((item) => {
                  const active = selected?.name === item.name;
                  return (
                    <button
                      type="button"
                      key={`${item.category}-${item.name}`}
                      aria-pressed={active}
                      onClick={() => {
                        setSelected(item);
                        setSearch(item.name);
                        setError('');
                      }}
                      className={cn(
                        'rounded-2xl border px-3 py-2 text-left text-sm transition',
                        active
                          ? 'border-purple-500 bg-purple-900/80 text-white'
                          : 'border-white/10 bg-white/[0.04] text-slate-200 hover:border-purple-500/60',
                      )}
                    >
                      <span className="font-semibold">{item.name}</span>
                      <span className="block text-xs text-slate-400">{item.category}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {offered ? (
              <fieldset>
                <legend className="text-sm text-slate-300">Your level</legend>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {PROFICIENCY_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        'cursor-pointer rounded-xl border px-3 py-2 text-center text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-purple-500',
                        proficiency === option.value
                          ? 'border-purple-500 bg-purple-900/80 text-white'
                          : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-purple-500/60',
                      )}
                    >
                      <input
                        type="radio"
                        name="proficiency"
                        value={option.value}
                        checked={proficiency === option.value}
                        onChange={() => setProficiency(option.value)}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {error ? (
              <p className="text-sm text-rose-300" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Dialog.Close className={dialogClose}>Cancel</Dialog.Close>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="h-9 bg-purple-600 px-4 text-white hover:bg-purple-500"
              >
                {mutation.isPending ? 'Adding…' : 'Add skill'}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SkillsCard({ kind }: { kind: 'offered' | 'wanted' }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  // Remounting the dialog on each open gives it a clean form.
  const [dialogKey, setDialogKey] = useState(0);
  const offered = kind === 'offered';

  const { data, isLoading } = useQuery({
    queryKey: ['skills', kind],
    queryFn: async () => (await api.get<Array<OfferedSkill | WantedSkill>>(`/skills/${kind}`)).data,
  });

  const removeMutation = useMutation({
    mutationFn: async (skillId: string) => {
      await api.delete(`/skills/${kind}/${skillId}`);
    },
    onSuccess: () => {
      for (const key of [['skills', kind], ['overview'], ['matches']]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      toast.success('Skill removed');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Could not remove skill'));
    },
  });

  return (
    <Card className="glass-card border-0">
      <CardHeader className="px-6 pt-2">
        <CardTitle className="text-xl font-semibold text-white">
          <h2>{offered ? 'Skills I offer' : 'Skills I want'}</h2>
        </CardTitle>
        <CardDescription className="text-sm text-slate-400">
          {offered ? 'What you can teach or help others with.' : 'What you would like to learn.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6">
        {isLoading ? (
          <div className="flex flex-wrap gap-3" role="status" aria-label="Loading skills">
            <div className="skeleton h-9 w-24 rounded-full" />
            <div className="skeleton h-9 w-32 rounded-full" />
          </div>
        ) : data?.length ? (
          <ul className="flex flex-wrap gap-3">
            {data.map((skill) => (
              <li
                key={skill.skillId}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm text-white',
                  offered ? 'border-purple-700/40 bg-purple-900/70' : 'border-emerald-600/40 bg-emerald-900/70',
                )}
              >
                <span>{skill.name}</span>
                {'proficiency' in skill ? (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.7rem] uppercase tracking-[0.12em] text-purple-100">
                    {skill.proficiency.toLowerCase()}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(skill.skillId)}
                  disabled={removeMutation.isPending}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-slate-200 transition hover:bg-white/20"
                  aria-label={`Remove ${skill.name}`}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">
            {offered ? 'No offered skills yet.' : 'No wanted skills yet.'}
          </p>
        )}
      </CardContent>
      <CardFooter className="border-white/[0.06] bg-transparent px-6 py-4">
        <Button
          onClick={() => {
            setDialogKey((key) => key + 1);
            setDialogOpen(true);
          }}
          className={cn(
            'h-9 w-full text-white',
            offered ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-purple-700 hover:bg-purple-600',
          )}
        >
          {offered ? 'Add a skill I offer' : 'Add a skill I want'}
        </Button>
      </CardFooter>
      <AddSkillDialog key={dialogKey} kind={kind} open={dialogOpen} onOpenChange={setDialogOpen} />
    </Card>
  );
}

function AvailabilityCard({ user }: { user: Me }) {
  const queryClient = useQueryClient();
  // null means "no unsaved edits": show what the server has.
  const [draft, setDraft] = useState<string[] | null>(null);
  const slots = draft ?? user.availability;

  const mutation = useMutation({
    mutationFn: async () => (await api.patch<Me>('/users/me', { availability: slots })).data,
    onSuccess: (data) => {
      queryClient.setQueryData(['me'], data);
      for (const key of ['overview', 'matches']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      setDraft(null);
      toast.success('Availability saved');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Could not save availability'));
    },
  });

  const toggle = (slot: string) =>
    setDraft(slots.includes(slot) ? slots.filter((s) => s !== slot) : [...slots, slot]);

  return (
    <section className="glass-card rounded-3xl p-6" aria-labelledby="availability-heading">
      <h2 id="availability-heading" className="text-xl font-semibold text-white">
        Weekly availability
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        Tap the times you are usually free. People with overlapping times rank higher in your matches.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] border-separate border-spacing-1.5 text-sm">
          <thead>
            <tr>
              <td />
              {AVAILABILITY_DAYS.map((day) => (
                <th key={day.key} scope="col" className="pb-1 text-xs font-medium text-slate-400">
                  {day.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AVAILABILITY_PERIODS.map((period) => (
              <tr key={period.key}>
                <th scope="row" className="pr-2 text-left text-xs font-medium text-slate-400">
                  {period.label}
                </th>
                {AVAILABILITY_DAYS.map((day) => {
                  const slot = slotKey(day.key, period.key);
                  const active = slots.includes(slot);
                  return (
                    <td key={slot}>
                      <button
                        type="button"
                        aria-pressed={active}
                        aria-label={`${day.label} ${period.label.toLowerCase()}`}
                        onClick={() => toggle(slot)}
                        className={cn(
                          'h-9 w-full rounded-lg border transition',
                          active
                            ? 'border-emerald-500/60 bg-emerald-600/70'
                            : 'border-white/10 bg-white/[0.04] hover:border-emerald-500/40',
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {draft ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="h-9 bg-emerald-600 px-4 text-white hover:bg-emerald-500"
          >
            {mutation.isPending ? 'Saving…' : 'Save availability'}
          </Button>
          <Button onClick={() => setDraft(null)} className="h-9 bg-white/5 px-4 text-white hover:bg-white/10">
            Discard changes
          </Button>
        </div>
      ) : null}
    </section>
  );
}

/** People you've blocked are hidden everywhere else, so this is where to undo it. */
function BlockedCard() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['blocks'],
    queryFn: async () => (await api.get<Array<{ blockedAt: string; user: UserSummary }>>('/blocks')).data,
  });

  const unblock = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/users/${userId}/block`);
    },
    onSuccess: () => {
      for (const key of ['blocks', 'matches', 'user']) queryClient.invalidateQueries({ queryKey: [key] });
      toast.success('Unblocked');
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Could not unblock')),
  });

  if (!data?.length) return null;

  return (
    <section className="glass-card rounded-3xl p-6" aria-labelledby="blocked-heading">
      <h2 id="blocked-heading" className="text-xl font-semibold text-white">
        Blocked people
      </h2>
      <p className="mt-1 text-sm text-slate-400">They can&apos;t find you, connect, or message you.</p>
      <ul className="mt-4 space-y-2">
        {data.map(({ user }) => (
          <li key={user.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3">
            <Avatar name={user.name} src={user.avatarUrl} size="sm" />
            <span className="min-w-0 flex-1 truncate text-sm text-white">{user.name}</span>
            <Button
              onClick={() => unblock.mutate(user.id)}
              disabled={unblock.isPending}
              className="h-8 bg-white/5 px-3 text-white hover:bg-white/10"
            >
              Unblock
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CalendarCard({ user }: { user: Me }) {
  const queryClient = useQueryClient();
  const disconnect = useMutation({
    mutationFn: async () => {
      await api.delete('/calendar/connection');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Google Calendar disconnected');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Could not disconnect Google Calendar'));
    },
  });

  return (
    <section className="glass-card rounded-3xl p-6" aria-labelledby="calendar-heading">
      <h2 id="calendar-heading" className="text-xl font-semibold text-white">
        Google Calendar
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        {user.hasGoogleCalendar
          ? 'Connected. Sessions you schedule are added to your calendar with a Meet link.'
          : 'Connect to add the sessions you schedule to your calendar automatically.'}
      </p>
      <div className="mt-4">
        {user.hasGoogleCalendar ? (
          <Button
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
            className="h-9 bg-white/5 px-4 text-white hover:bg-white/10"
          >
            Disconnect
          </Button>
        ) : (
          <Button
            onClick={() => window.location.assign(`${apiBaseURL}/calendar/connect`)}
            className="h-9 bg-purple-700 px-4 text-white hover:bg-purple-600"
          >
            Connect Google Calendar
          </Button>
        )}
      </div>
    </section>
  );
}

export default function ProfilePage() {
  const { data: user, isLoading, isError } = useMe();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editKey, setEditKey] = useState(0);

  if (isLoading) {
    return (
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[360px_1fr]" role="status" aria-label="Loading profile">
          <div className="skeleton h-96 rounded-3xl" />
          <div className="space-y-6">
            <div className="skeleton h-48 rounded-3xl" />
            <div className="skeleton h-48 rounded-3xl" />
          </div>
        </div>
      </main>
    );
  }

  if (isError || !user) {
    return (
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <section className="mx-auto max-w-3xl glass-card rounded-3xl p-10 text-center text-rose-200" role="alert">
          We couldn&apos;t load your profile. Please refresh the page.
        </section>
      </main>
    );
  }

  return (
    <PageTransition>
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-purple-300">Profile</p>
              <h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl">Your profile</h1>
              <p className="mt-2 text-sm text-slate-400">
                Your skills and availability decide who you are matched with.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/users/${user.id}`}
                className="inline-flex h-9 items-center rounded-lg bg-white/5 px-4 text-sm font-medium text-white hover:bg-white/10"
              >
                View public profile
              </Link>
              <Button
                onClick={() => {
                  setEditKey((key) => key + 1);
                  setIsEditOpen(true);
                }}
                className="h-9 bg-purple-700 px-4 text-white hover:bg-purple-600"
              >
                Edit profile
              </Button>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <SlideUp>
              <section className="glass-card space-y-5 rounded-3xl p-6" aria-label="About you">
                <div className="flex items-center gap-4">
                  <Avatar name={user.name} src={user.avatarUrl} size="xl" />
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-lg font-semibold text-white">{user.name}</p>
                    <p className="truncate text-sm text-slate-400">{user.college ?? 'No college listed'}</p>
                    <Rating value={user.ratingAvg} count={user.reviewCount} />
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-medium text-slate-100">Bio</h2>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">
                    {user.bio || 'No bio yet. Tell people what you love teaching and what you want to learn.'}
                  </p>
                </div>

                <div>
                  <h2 className="flex items-center gap-2 text-sm font-medium text-slate-100">
                    <Award className="h-4 w-4 text-purple-400" aria-hidden="true" />
                    Badges
                  </h2>
                  {user.badges.length > 0 ? (
                    <ul className="mt-2 space-y-2">
                      {user.badges.map(({ badge }) => (
                        <li key={badge.id} className="rounded-2xl border border-purple-500/30 bg-purple-950/40 px-3 py-2">
                          <p className="text-sm font-medium text-purple-100">{badge.name}</p>
                          <p className="text-xs text-slate-400">{badge.criteria}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-slate-400">
                      Complete your first session to earn the First Swap badge.
                    </p>
                  )}
                </div>

                <dl className="text-sm">
                  <dt className="text-slate-400">Email (only visible to you)</dt>
                  <dd className="break-all text-slate-200">{user.email}</dd>
                </dl>
              </section>
            </SlideUp>

            <div className="space-y-6">
              <SlideUp>
                <SkillsCard kind="offered" />
              </SlideUp>
              <SlideUp>
                <SkillsCard kind="wanted" />
              </SlideUp>
              <SlideUp>
                <AvailabilityCard user={user} />
              </SlideUp>
              {user.googleCalendarAvailable ? (
                <SlideUp>
                  <CalendarCard user={user} />
                </SlideUp>
              ) : null}
              <BlockedCard />
            </div>
          </div>
        </div>

        <EditProfileDialog key={editKey} user={user} open={isEditOpen} onOpenChange={setIsEditOpen} />
      </main>
    </PageTransition>
  );
}
