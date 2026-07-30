'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { changePasswordAction } from '@/lib/auth/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Authenticated password change (§23.3 — distinct from the recovery flow). */
export function PasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set('currentPassword', current);
    formData.set('newPassword', next);

    startTransition(async () => {
      const result = await changePasswordAction(null, formData);
      if (!result.ok) {
        setError(result.message ?? 'Could not update your password.');
        return;
      }
      toast.success(result.message ?? 'Password updated');
      setCurrent('');
      setNext('');
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-md gap-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-2">
        <Label htmlFor="current-password">Current password</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(event) => setNext(event.target.value)}
          required
          minLength={12}
        />
        <p className="text-muted-foreground text-xs">
          At least 12 characters, with uppercase, lowercase, and a digit.
        </p>
      </div>

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? 'Updating…' : 'Update password'}
      </Button>
    </form>
  );
}
