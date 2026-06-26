'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog } from '@base-ui/react/dialog';
import { Select } from '@base-ui/react/select';
import { Star, Award } from 'lucide-react';

const proficiencyOptions = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'EXPERT', label: 'Expert' },
];

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOfferedOpen, setIsAddOfferedOpen] = useState(false);
  const [isAddWantedOpen, setIsAddWantedOpen] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<{ name: string; category: string } | null>(null);
  const [proficiency, setProficiency] = useState('INTERMEDIATE');
  const [isCustom, setIsCustom] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', bio: '', college: '', avatarUrl: '' });
  const [editError, setEditError] = useState('');
  const [addError, setAddError] = useState('');

  const userQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data;
    },
  });

  const catalogQuery = useQuery({
    queryKey: ['skills', 'catalog'],
    queryFn: async () => {
      const res = await api.get('/skills/catalog');
      return res.data as Record<string, string[]>;
    },
  });

  const offeredQuery = useQuery({
    queryKey: ['skills', 'offered'],
    queryFn: async () => {
      const res = await api.get('/skills/offered');
      return res.data as Array<{ skillId: string; name: string; category: string; proficiency: string }>;
    },
  });

  const wantedQuery = useQuery({
    queryKey: ['skills', 'wanted'],
    queryFn: async () => {
      const res = await api.get('/skills/wanted');
      return res.data as Array<{ skillId: string; name: string; category: string }>;
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: { name: string; bio: string; college: string; avatarUrl: string }) => {
      const res = await api.patch('/users/me', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['me'], data);
      setIsEditOpen(false);
      setEditError('');
    },
    onError: (error: any) => {
      setEditError(error.response?.data?.message || 'Could not save profile');
    },
  });

  const addOfferedMutation = useMutation({
    mutationFn: async (payload: { name: string; category?: string; proficiency: string }) => {
      await api.post('/skills/offered', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills', 'offered'] });
      setIsAddOfferedOpen(false);
      resetSkillDialog();
      setAddError('');
    },
    onError: (error: any) => {
      setAddError(error.response?.data?.message || 'Could not add skill');
    },
  });

  const addWantedMutation = useMutation({
    mutationFn: async (payload: { name: string; category?: string }) => {
      await api.post('/skills/wanted', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills', 'wanted'] });
      setIsAddWantedOpen(false);
      resetSkillDialog();
      setAddError('');
    },
    onError: (error: any) => {
      setAddError(error.response?.data?.message || 'Could not add skill');
    },
  });

  const removeOfferedMutation = useMutation({
    mutationFn: async (skillId: string) => {
      await api.delete(`/skills/offered/${skillId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['skills', 'offered'] }),
  });

  const removeWantedMutation = useMutation({
    mutationFn: async (skillId: string) => {
      await api.delete(`/skills/wanted/${skillId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['skills', 'wanted'] }),
  });

  const catalogItems = useMemo(() => {
    if (!catalogQuery.data) return [];
    return Object.entries(catalogQuery.data).flatMap(([category, items]) =>
      items.map((item) => ({ category, name: item })),
    );
  }, [catalogQuery.data]);

  const filteredCatalog = useMemo(() => {
    const query = skillSearch.trim().toLowerCase();
    if (!query) return catalogItems;
    return catalogItems.filter((item) =>
      item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query),
    );
  }, [catalogItems, skillSearch]);

  const resetSkillDialog = () => {
    setSkillSearch('');
    setSelectedSkill(null);
    setIsCustom(false);
    setProficiency('INTERMEDIATE');
  };

  const handleOpenEdit = () => {
    setProfileForm({
      name: userQuery.data?.name ?? '',
      bio: userQuery.data?.bio ?? '',
      college: userQuery.data?.college ?? '',
      avatarUrl: userQuery.data?.avatarUrl ?? '',
    });
    setEditError('');
    setIsEditOpen(true);
  };

  const handleAddOffered = () => {
    const name = selectedSkill?.name ?? skillSearch.trim();
    const category = selectedSkill?.category ?? (isCustom ? 'Custom' : undefined);
    if (!name) {
      setAddError('Enter a skill name');
      return;
    }
    addOfferedMutation.mutate({ name, category, proficiency });
  };

  const handleAddWanted = () => {
    const name = selectedSkill?.name ?? skillSearch.trim();
    const category = selectedSkill?.category ?? (isCustom ? 'Custom' : undefined);
    if (!name) {
      setAddError('Enter a skill name');
      return;
    }
    addWantedMutation.mutate({ name, category });
  };

  const availableProfile = userQuery.isSuccess && userQuery.data;

  return (
    <div className="min-h-screen bg-[#111018] px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-purple-300">Profile</p>
            <h1 className="text-4xl font-bold text-white">Your SkillSwap Profile</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-400">
              Manage your public bio, avatar, and the skills you offer and want.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard">
              <Button variant="secondary" className="bg-white/5 text-white hover:bg-white/10">
                Back to Dashboard
              </Button>
            </Link>
            <Button onClick={handleOpenEdit} className="bg-purple-700 text-white hover:bg-purple-600">
              Edit Profile
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <Card className="overflow-hidden bg-slate-950/90 border border-slate-800 shadow-lg shadow-violet-800/20">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-purple-900 text-3xl font-semibold text-white">
                  {availableProfile ? (userQuery.data.avatarUrl ? <img src={userQuery.data.avatarUrl} alt="avatar" className="h-20 w-20 rounded-3xl object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.textContent = userQuery.data.name?.charAt(0).toUpperCase() ?? 'U'; }} /> : userQuery.data.name?.charAt(0).toUpperCase() ?? 'U') : 'U'}
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-white">{availableProfile ? userQuery.data.name : 'Loading...'}</p>
                  <p className="text-sm text-slate-400">{availableProfile ? userQuery.data.college ?? 'No college listed' : '...'}</p>
                  {availableProfile && userQuery.data.ratingAvg !== undefined && (
                    <div className="flex items-center gap-1 text-amber-400 text-sm mt-1">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="font-semibold">{(userQuery.data.ratingAvg ?? 0).toFixed(1)}</span>
                      <span className="text-slate-400 text-xs ml-0.5">Rating</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-3xl bg-slate-900/80 p-4 text-sm text-slate-300">
                <p className="font-medium text-slate-100">Bio</p>
                <p className="mt-2 text-sm text-slate-300">{availableProfile ? userQuery.data.bio || 'No bio added yet.' : '...'}</p>
              </div>

              {availableProfile && userQuery.data.badges && userQuery.data.badges.length > 0 && (
                <div className="rounded-3xl bg-slate-900/80 p-4 text-sm">
                  <p className="font-medium text-slate-100 mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4 text-purple-400" />
                    <span>Earned Badges</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {userQuery.data.badges.map((ub: any) => (
                      <div
                        key={ub.badge.id}
                        className="group relative inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-950/40 px-3 py-1.5 text-xs text-purple-200 cursor-help"
                      >
                        <Award className="h-3.5 w-3.5 text-purple-400" />
                        <span className="font-medium">{ub.badge.name}</span>
                        {/* Tooltip */}
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-48 -translate-x-1/2 rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-center text-xs text-slate-300 opacity-0 transition-opacity duration-200 shadow-xl group-hover:opacity-100">
                          <p className="font-bold text-white mb-1">{ub.badge.name}</p>
                          <p className="text-slate-400 text-[10px] leading-relaxed">{ub.badge.criteria}</p>
                          <div className="absolute top-full left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 border-r border-b border-slate-800 bg-slate-950"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid gap-3 px-1 text-sm text-slate-400">
                <div className="flex items-center justify-between rounded-2xl bg-slate-900/80 px-4 py-3">
                  <span>Avatar URL</span>
                  <span className="text-slate-300 break-all max-w-[180px] text-right">{availableProfile ? userQuery.data.avatarUrl || '—' : '...'}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-900/80 px-4 py-3">
                  <span>Email</span>
                  <span className="text-slate-300">{availableProfile ? userQuery.data.email : '...'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-slate-950/90 border border-slate-800 shadow-lg shadow-emerald-800/10">
              <CardHeader className="px-6 py-5">
                <CardTitle className="text-xl font-semibold text-white">Skills I Offer</CardTitle>
                <CardDescription className="text-sm text-slate-400">
                  Add the skills you can teach or support others with.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-6 pb-6">
                <div className="flex flex-wrap gap-3">
                  {offeredQuery.data?.length ? (
                    offeredQuery.data.map((skill) => (
                      <div key={skill.skillId} className="group inline-flex items-center gap-2 rounded-full border border-purple-700/40 bg-purple-900/70 px-3 py-2 text-sm text-white shadow-sm shadow-purple-900/20">
                        <span>{skill.name}</span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.7rem] uppercase tracking-[0.12em] text-purple-100">
                          {skill.proficiency.toLowerCase()}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeOfferedMutation.mutate(skill.skillId)}
                          className="rounded-full bg-white/10 p-1 text-sm text-slate-200 transition hover:bg-white/15"
                          aria-label={`Remove offered skill ${skill.name}`}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">No offered skills yet.</p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-slate-900/80 p-6">
                <Button onClick={() => { resetSkillDialog(); setIsAddOfferedOpen(true); }} className="w-full bg-emerald-600 text-white hover:bg-emerald-500">
                  Add Offered Skill
                </Button>
              </CardFooter>
            </Card>

            <Card className="bg-slate-950/90 border border-slate-800 shadow-lg shadow-violet-800/10">
              <CardHeader className="px-6 py-5">
                <CardTitle className="text-xl font-semibold text-white">Skills I Want</CardTitle>
                <CardDescription className="text-sm text-slate-400">
                  Track skills you want to learn or swap for.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-6 pb-6">
                <div className="flex flex-wrap gap-3">
                  {wantedQuery.data?.length ? (
                    wantedQuery.data.map((skill) => (
                      <div key={skill.skillId} className="group inline-flex items-center gap-2 rounded-full border border-emerald-600/40 bg-emerald-900/70 px-3 py-2 text-sm text-white shadow-sm shadow-emerald-900/20">
                        <span>{skill.name}</span>
                        <button
                          type="button"
                          onClick={() => removeWantedMutation.mutate(skill.skillId)}
                          className="rounded-full bg-white/10 p-1 text-slate-200 transition hover:bg-white/15"
                          aria-label={`Remove wanted skill ${skill.name}`}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">No wanted skills yet.</p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-slate-900/80 p-6">
                <Button onClick={() => { resetSkillDialog(); setIsAddWantedOpen(true); }} className="w-full bg-purple-700 text-white hover:bg-purple-600">
                  Add Wanted Skill
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>

      <Dialog.Root open={isEditOpen} onOpenChange={setIsEditOpen} modal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between gap-4">
            <Dialog.Title className="text-xl font-semibold text-white">Edit Profile</Dialog.Title>
            <Dialog.Close className="rounded-full bg-white/10 px-3 py-2 text-white transition hover:bg-white/20">Close</Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 text-sm text-slate-400">
            Update your name, bio, college, and avatar URL.
          </Dialog.Description>
          <div className="mt-6 space-y-4">
            <label className="block text-sm text-slate-300">Name</label>
            <Input value={profileForm.name} onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Name" />
            <label className="block text-sm text-slate-300">Bio</label>
            <textarea
              value={profileForm.bio}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))}
              className="min-h-[100px] w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-3 text-sm text-white outline-none transition focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20"
              placeholder="Tell others what you offer and what you want to learn"
            />
            <label className="block text-sm text-slate-300">College</label>
            <Input value={profileForm.college} onChange={(event) => setProfileForm((prev) => ({ ...prev, college: event.target.value }))} placeholder="College or school" />
            <label className="block text-sm text-slate-300">Avatar URL</label>
            <Input value={profileForm.avatarUrl} onChange={(event) => setProfileForm((prev) => ({ ...prev, avatarUrl: event.target.value }))} placeholder="https://..." />
            {editError ? <p className="text-sm text-red-400">{editError}</p> : null}
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            <Dialog.Close className="rounded-full bg-white/5 text-white hover:bg-white/10 px-4 py-3">Cancel</Dialog.Close>
            <Button onClick={() => updateProfileMutation.mutate(profileForm)} className="bg-purple-600 text-white hover:bg-purple-500">
              Save Profile
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Root>

      <Dialog.Root open={isAddOfferedOpen} onOpenChange={setIsAddOfferedOpen} modal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between gap-4">
            <Dialog.Title className="text-xl font-semibold text-white">Add Offered Skill</Dialog.Title>
            <Dialog.Close className="rounded-full bg-white/10 px-3 py-2 text-white transition hover:bg-white/20">Close</Dialog.Close>
          </div>
          <p className="mt-2 text-sm text-slate-400">Search the skill catalog or type a custom skill. Choose a proficiency level.</p>
          <div className="mt-6 space-y-4">
            <label className="block text-sm text-slate-300">Skill name</label>
            <Input
              value={skillSearch}
              onChange={(event) => { setSkillSearch(event.target.value); setSelectedSkill(null); setIsCustom(true); }}
              placeholder="e.g. Python, UI Design, Guitar"
            />
            <div className="grid gap-2">
              {filteredCatalog.slice(0, 6).map((item) => (
                <button
                  type="button"
                  key={`${item.category}-${item.name}`}
                  onClick={() => {
                    setSelectedSkill(item);
                    setSkillSearch(item.name);
                    setIsCustom(false);
                  }}
                  className={`rounded-2xl border px-3 py-2 text-left text-sm transition ${selectedSkill?.name === item.name ? 'border-purple-500 bg-purple-900/80 text-white' : 'border-slate-800 bg-slate-900/80 text-slate-200 hover:border-purple-500 hover:bg-slate-900'}`}
                >
                  <span className="font-semibold">{item.name}</span>
                  <span className="block text-xs text-slate-400">{item.category}</span>
                </button>
              ))}
            </div>
            <label className="block text-sm text-slate-300">Proficiency</label>
            <Select.Root value={proficiency} onValueChange={(value) => setProficiency(value ?? 'INTERMEDIATE')}>
              <Select.Trigger className="inline-flex h-11 w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/90 px-4 text-sm text-white outline-none focus:border-purple-500/70 focus:ring-2 focus:ring-purple-500/20">
                <Select.Value placeholder="Select proficiency" />
                <Select.Icon className="text-slate-300" />
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner>
                  <Select.Backdrop className="rounded-3xl bg-black/30" />
                  <Select.Popup className="mt-2 w-full min-w-[220px] rounded-3xl border border-slate-800 bg-slate-950 p-2 shadow-2xl shadow-black/50">
                    <Select.List className="space-y-1">
                      {proficiencyOptions.map((option) => (
                        <Select.Item key={option.value} value={option.value} className="rounded-2xl px-3 py-3 text-sm text-white transition hover:bg-purple-600/20 data-[selected=true]:bg-purple-700 data-[selected=true]:text-white">
                          <Select.ItemText>{option.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.List>
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
            {addError ? <p className="text-sm text-red-400">{addError}</p> : null}
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            <Dialog.Close className="rounded-full bg-white/5 text-white hover:bg-white/10 px-4 py-3">Cancel</Dialog.Close>
            <Button onClick={handleAddOffered} className="bg-purple-600 text-white hover:bg-purple-500">Add Skill</Button>
          </div>
        </Dialog.Popup>
      </Dialog.Root>

      <Dialog.Root open={isAddWantedOpen} onOpenChange={setIsAddWantedOpen} modal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between gap-4">
            <Dialog.Title className="text-xl font-semibold text-white">Add Wanted Skill</Dialog.Title>
            <Dialog.Close className="rounded-full bg-white/10 px-3 py-2 text-white transition hover:bg-white/20">Close</Dialog.Close>
          </div>
          <p className="mt-2 text-sm text-slate-400">Search the skill catalog or type a custom skill to add to your wanted list.</p>
          <div className="mt-6 space-y-4">
            <label className="block text-sm text-slate-300">Skill name</label>
            <Input
              value={skillSearch}
              onChange={(event) => { setSkillSearch(event.target.value); setSelectedSkill(null); setIsCustom(true); }}
              placeholder="e.g. Public Speaking, Figma, Piano"
            />
            <div className="grid gap-2">
              {filteredCatalog.slice(0, 6).map((item) => (
                <button
                  type="button"
                  key={`${item.category}-${item.name}`}
                  onClick={() => {
                    setSelectedSkill(item);
                    setSkillSearch(item.name);
                    setIsCustom(false);
                  }}
                  className={`rounded-2xl border px-3 py-2 text-left text-sm transition ${selectedSkill?.name === item.name ? 'border-emerald-500 bg-emerald-900/80 text-white' : 'border-slate-800 bg-slate-900/80 text-slate-200 hover:border-emerald-500 hover:bg-slate-900'}`}
                >
                  <span className="font-semibold">{item.name}</span>
                  <span className="block text-xs text-slate-400">{item.category}</span>
                </button>
              ))}
            </div>
            {addError ? <p className="text-sm text-red-400">{addError}</p> : null}
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            <Dialog.Close className="rounded-full bg-white/5 text-white hover:bg-white/10 px-4 py-3">Cancel</Dialog.Close>
            <Button onClick={handleAddWanted} className="bg-emerald-600 text-white hover:bg-emerald-500">Add Skill</Button>
          </div>
        </Dialog.Popup>
      </Dialog.Root>
    </div>
  );
}
