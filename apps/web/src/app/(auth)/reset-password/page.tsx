'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MIN_PASSWORD_LENGTH = 6;

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  if (!token) {
    return (
      <p className="text-center text-sm text-rose-200" role="alert">
        This link is missing its reset token.{' '}
        <Link href="/forgot-password" className="text-primary hover:underline">
          Request a new link
        </Link>
        .
      </p>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('The passwords do not match.');
      return;
    }
    setError('');
    setPending(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Password updated. Log in with your new password.');
      router.replace('/login');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not reset the password.'));
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input
          id="confirm"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
      </div>
      {error ? (
        <p className="text-sm text-rose-300" role="alert">
          {error}{' '}
          {error.includes('expired') ? (
            <Link href="/forgot-password" className="text-primary hover:underline">
              Request a new link
            </Link>
          ) : null}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Saving…' : 'Set new password'}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <PageTransition>
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <section className="w-full max-w-md">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-center text-2xl font-bold">
                <h1>Choose a new password</h1>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* useSearchParams needs a Suspense boundary to prerender. */}
              <Suspense fallback={<div className="skeleton h-40 rounded-2xl" />}>
                <ResetPasswordForm />
              </Suspense>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Changing your password signs you out on every device.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </PageTransition>
  );
}
