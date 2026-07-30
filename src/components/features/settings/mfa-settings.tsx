'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { ShieldCheckIcon, ShieldIcon } from 'lucide-react';
import {
  beginDemoSelfMfaEnrollmentAction,
  beginSupabaseMfaEnrollmentAction,
  confirmDemoSelfMfaEnrollmentAction,
  verifySupabaseMfaAction,
} from '@/lib/auth/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MfaSettingsProps {
  mfaEnrolled: boolean;
  /** `true` once Supabase is configured — routes enrolment through Supabase's factor API. */
  supabaseMode: boolean;
}

/**
 * Voluntary MFA self-service (MASTER_BUILD_SPEC.md §23.3 — "security: MFA").
 * Distinct from the mandatory admin enrolment gated at login
 * (`components/features/auth/mfa-enroll.tsx`), which this deliberately does
 * not modify or reuse — that component is wired to the login redirect flow.
 */
export function MfaSettings({ mfaEnrolled, supabaseMode }: MfaSettingsProps) {
  const [enrollment, setEnrollment] = useState<{
    secret: string;
    qrSvg: string;
    factorId?: string;
  } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState(mfaEnrolled);
  const [isPending, startTransition] = useTransition();

  function startEnrollment() {
    setError(null);
    startTransition(async () => {
      try {
        const result = supabaseMode
          ? await beginSupabaseMfaEnrollmentAction()
          : await beginDemoSelfMfaEnrollmentAction();
        setEnrollment(result);
      } catch (thrown) {
        setError(thrown instanceof Error ? thrown.message : 'Could not start enrolment.');
      }
    });
  }

  function onVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set('code', code);
    formData.set('next', '/settings/security');
    if (enrollment?.factorId) formData.set('factorId', enrollment.factorId);

    startTransition(async () => {
      const action = supabaseMode
        ? verifySupabaseMfaAction
        : confirmDemoSelfMfaEnrollmentAction;
      const result = await action(null, formData);
      if (!result.ok) {
        setError(result.message ?? 'Incorrect code.');
        return;
      }
      setEnrolled(true);
      setEnrollment(null);
      toast.success('Two-factor authentication enabled');
    });
  }

  return (
    <div className="grid max-w-md gap-4">
      <div className="flex items-center gap-2">
        <Badge variant={enrolled ? 'success' : 'outline'} className="gap-1">
          {enrolled ? (
            <ShieldCheckIcon className="size-3" />
          ) : (
            <ShieldIcon className="size-3" />
          )}
          {enrolled ? 'Enabled' : 'Not enabled'}
        </Badge>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!enrolled && !enrollment && (
        <Button onClick={startEnrollment} disabled={isPending} className="w-fit">
          {isPending ? 'Starting…' : 'Enable two-factor authentication'}
        </Button>
      )}

      {enrollment && (
        <div className="grid gap-4">
          <p className="text-muted-foreground text-sm">
            Scan this code with an authenticator app, then enter the 6-digit code it
            generates.
          </p>
          <div
            className="border-border bg-card mx-auto flex w-fit items-center justify-center rounded-lg border p-3 [&_svg]:size-[180px]"
            dangerouslySetInnerHTML={{ __html: enrollment.qrSvg }}
          />
          <code className="border-border bg-muted rounded-md border px-2 py-1 text-center font-mono text-xs tracking-widest">
            {enrollment.secret}
          </code>
          <form onSubmit={onVerify} className="grid gap-3">
            <Label htmlFor="settings-mfa-code">6-digit code</Label>
            <Input
              id="settings-mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              className="text-center tracking-[0.5em]"
            />
            <Button
              type="submit"
              disabled={isPending || code.length !== 6}
              className="w-fit"
            >
              {isPending ? 'Verifying…' : 'Verify and enable'}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
