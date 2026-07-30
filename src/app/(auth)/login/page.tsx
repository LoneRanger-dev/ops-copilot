import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { siteConfig } from '@/config/site';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LoginForm } from '@/components/features/auth/login-form';
import { SsoButton } from '@/components/features/auth/sso-button';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use your {siteConfig.name} account to continue.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        {siteConfig.ssoEnabled ? (
          <>
            <div className="relative py-1 text-center">
              <span className="border-border absolute inset-0 top-1/2 border-t" />
              <span className="bg-card text-muted-foreground relative px-2 text-xs uppercase">
                or
              </span>
            </div>
            <Suspense fallback={null}>
              <SsoButton />
            </Suspense>
          </>
        ) : null}

        <p className="text-muted-foreground text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
