'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { challengeDemoMfaAction, verifySupabaseMfaAction } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MfaChallengeProps {
  next: string;
  /** Present only in Supabase mode — the already-enrolled TOTP factor's id. */
  factorId?: string;
}

/** MFA challenge for an already-enrolled user, at every sign-in. */
export function MfaChallenge({ next, factorId }: MfaChallengeProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set('code', code);
    formData.set('next', next);
    if (factorId) formData.set('factorId', factorId);

    startTransition(async () => {
      const action = factorId ? verifySupabaseMfaAction : challengeDemoMfaAction;
      const result = await action(null, formData);
      if (result && !result.ok) setError(result.message ?? 'Something went wrong.');
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <p className="text-muted-foreground text-sm">
        Enter the 6-digit code from your authenticator app to finish signing in.
      </p>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="mfa-challenge-code">6-digit code</Label>
        <Input
          id="mfa-challenge-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          className="text-center tracking-[0.5em]"
        />
      </div>

      <Button type="submit" disabled={isPending || code.length !== 6}>
        {isPending ? 'Verifying…' : 'Verify'}
      </Button>
    </form>
  );
}
