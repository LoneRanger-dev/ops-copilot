'use client';

import { useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { signInWithAzureAd } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Azure AD OIDC SSO entry point. Rendered only when `NEXT_PUBLIC_SSO_ENABLED`
 * is `true` (§23.2 frontend task 7) — the parent page checks
 * `siteConfig.ssoEnabled` before mounting this component at all.
 */
export function SsoButton() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/dashboard';

  function onClick() {
    setError(null);
    startTransition(async () => {
      try {
        await signInWithAzureAd(next);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not start Microsoft sign-in.',
        );
      }
    });
  }

  return (
    <div className="grid gap-2">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="button" variant="outline" onClick={onClick} disabled={isPending}>
        {isPending ? 'Redirecting…' : 'Continue with Microsoft'}
      </Button>
    </div>
  );
}
