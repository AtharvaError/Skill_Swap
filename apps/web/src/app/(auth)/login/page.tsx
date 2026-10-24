'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { PageTransition } from '@/components/PageTransition';
import { getApiErrorMessage } from '@/lib/errors';

const formSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export default function LoginPage() {
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await api.post('/auth/login', values);
      toast.success('Welcome back! Redirecting...');
      router.push('/dashboard');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Invalid credentials'));
    }
  }

  return (
    <PageTransition>
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <section className="w-full max-w-md">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">
                <h1>Log In</h1>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="email">Email</FormLabel>
                        <FormControl>
                          <Input id="email" type="email" placeholder="john@example.com" aria-label="Email address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="password">Password</FormLabel>
                        <FormControl>
                          <Input id="password" type="password" placeholder="******" aria-label="Password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" aria-label="Log in to your account">
                    Log In
                  </Button>
                </form>
              </Form>
              <p className="mt-4 text-center text-sm">
                <Link href="/forgot-password" className="text-primary hover:underline">
                  Forgot your password?
                </Link>
              </p>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-primary hover:underline" aria-label="Sign up for free">
                  Sign up
                </Link>
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </PageTransition>
  );
}
