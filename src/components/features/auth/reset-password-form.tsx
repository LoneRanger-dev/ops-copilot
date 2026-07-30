'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { resetPasswordSchema } from '@/lib/auth/schemas';
import { resetPasswordAction } from '@/lib/auth/actions';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

// The client only ever collects the new password; `token` (demo mode) rides
// along from the URL and Supabase mode ignores it (recovery is session-based).
const clientSchema = resetPasswordSchema.pick({ password: true });
type ClientInput = z.infer<typeof clientSchema>;

export function ResetPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const form = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: { password: '' },
  });

  function onSubmit(values: ClientInput) {
    setFormError(null);
    const formData = new FormData();
    formData.set('password', values.password);
    formData.set('token', token);

    startTransition(async () => {
      const result = await resetPasswordAction(null, formData);
      if (result && !result.ok) setFormError(result.message ?? 'Something went wrong.');
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending} className="mt-2">
          {isPending ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </Form>
  );
}
