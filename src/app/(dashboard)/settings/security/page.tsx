import type { Metadata } from 'next';
import { signOutAction } from '@/lib/auth/actions';
import { requireUser } from '@/lib/auth/server';
import { isConfigured } from '@/config/env';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MfaSettings } from '@/components/features/settings/mfa-settings';
import { PasswordForm } from '@/components/features/settings/password-form';
import { SettingsNav } from '@/components/features/settings/settings-nav';

export const metadata: Metadata = { title: 'Security' };

export default async function SecuritySettingsPage() {
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, appearance, and security."
      />
      <SettingsNav />

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Change the password used to sign in.</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>
            {user.role === 'admin'
              ? 'Required for administrator accounts.'
              : 'Optional — adds a second verification step at sign-in.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MfaSettings
            mfaEnrolled={user.mfaEnrolled}
            supabaseMode={isConfigured.supabase}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>End your session on this device.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Separator />
          <form action={signOutAction}>
            <Button type="submit" variant="outline">
              Sign out of this device
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
