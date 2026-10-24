'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Could not send the reset link. Please try again.'));
    } finally {
      setPending(false);
    }
  };

  return (
    <PageTransition>
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <section className="w-full max-w-md">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-center text-2xl font-bold">
                <h1>Reset your password</h1>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sent ? (
                <p className="text-center text-sm text-slate-300" role="status">
                  If an account exists for <span className="font-medium text-white">{email}</span>, we&apos;ve
                  emailed a link to reset the password. It expires in an hour.
                </p>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <p className="text-sm text-slate-400">
                    Enter the email you signed up with and we&apos;ll send you a reset link.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="john@example.com"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={pending}>
                    {pending ? 'Sending…' : 'Send reset link'}
                  </Button>
                </form>
              )}
              <p className="mt-4 text-center text-sm text-muted-foreground">
                <Link href="/login" className="text-primary hover:underline">
                  Back to log in
                </Link>
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </PageTransition>
  );
}
