import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/server';
import { PageHeader } from '@/components/shared/page-header';
import { ProfileForm } from '@/components/features/settings/profile-form';
import { SettingsNav } from '@/components/features/settings/settings-nav';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, appearance, and security."
      />
      <SettingsNav />
      <ProfileForm
        email={user.email}
        fullName={user.fullName}
        department={user.department}
        role={user.role}
      />
    </div>
  );
}
