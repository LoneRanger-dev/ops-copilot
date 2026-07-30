import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/server';
import { PageHeader } from '@/components/shared/page-header';
import { AppearanceForm } from '@/components/features/settings/appearance-form';
import { SettingsNav } from '@/components/features/settings/settings-nav';

export const metadata: Metadata = { title: 'Appearance' };

export default async function AppearanceSettingsPage() {
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, appearance, and security."
      />
      <SettingsNav />
      <AppearanceForm initialDensity={user.preferences.density} />
    </div>
  );
}
