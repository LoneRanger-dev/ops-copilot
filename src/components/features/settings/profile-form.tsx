'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProfileFormProps {
  email: string;
  fullName: string | null;
  department: string | null;
  role: string;
}

/** Profile settings (MASTER_BUILD_SPEC.md §23.3, `PATCH /api/v1/profile`). */
export function ProfileForm({ email, fullName, department, role }: ProfileFormProps) {
  const [name, setName] = useState(fullName ?? '');
  const [dept, setDept] = useState(department ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: name, department: dept }),
      });
      const body = (await response.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!body.success) {
        setError(body.error?.message ?? 'Could not update your profile.');
        return;
      }
      toast.success('Profile updated');
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
        <Label htmlFor="profile-email">Email</Label>
        <Input id="profile-email" value={email} disabled readOnly />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="profile-role">Role</Label>
        <Input id="profile-role" value={role} disabled readOnly />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="profile-name">Display name</Label>
        <Input
          id="profile-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="profile-department">Department</Label>
        <Input
          id="profile-department"
          value={dept}
          onChange={(event) => setDept(event.target.value)}
          maxLength={120}
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
