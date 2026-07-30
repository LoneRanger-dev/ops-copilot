'use client';

import { useState, useTransition, type FormEvent } from 'react';
import {
  confirmDemoMfaEnrollmentAction,
  verifySupabaseMfaAction,
} from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MfaEnrollProps {
  qrSvg: string;
  secret: string;
  next: string;
  /** Present only in Supabase mode — routes verification through Supabase's factor API. */
  factorId?: string;
}

/** MFA enrolment: scan QR (or enter the secret manually), then verify a code. */
export function MfaEnroll({ qrSvg, secret, next, factorId }: MfaEnrollProps) {
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
      const action = factorId ? verifySupabaseMfaAction : confirmDemoMfaEnrollmentAction;
      const result = await action(null, formData);
      if (result && !result.ok) setError(result.message ?? 'Something went wrong.');
    });
  }

  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground text-sm">
        Administrator accounts require multi-factor authentication. Scan this code with an
        authenticator app (1Password, Authy, Google Authenticator), then enter the 6-digit
        code it generates.
      </p>

      <div
        className="border-border bg-card mx-auto flex w-fit items-center justify-center rounded-lg border p-3 [&_svg]:size-[200px]"
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />

      <div className="grid gap-1">
        <Label htmlFor="mfa-secret" className="text-muted-foreground text-xs">
          Can&apos;t scan? Enter this key manually:
        </Label>
        <code
          id="mfa-secret"
          className="border-border bg-muted rounded-md border px-2 py-1 text-center font-mono text-xs tracking-widest"
        >
          {secret}
        </code>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="mfa-code">6-digit code</Label>
          <Input
            id="mfa-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            className="text-center tracking-[0.5em]"
          />
        </div>

        <Button type="submit" disabled={isPending || code.length !== 6}>
          {isPending ? 'Verifying…' : 'Verify and enable MFA'}
        </Button>
      </form>
    </div>
  );
}
