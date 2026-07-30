'use client';

import { useTransition } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { LaptopIcon, MoonIcon, SunIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils/cn';
import type { DensityPreference, ThemePreference } from '@/config/constants';

interface AppearanceFormProps {
  initialDensity: DensityPreference;
}

const THEME_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof SunIcon;
}> = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: LaptopIcon },
];

const DENSITY_OPTIONS: Array<{ value: DensityPreference; label: string }> = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
];

/**
 * Theme and density settings (MASTER_BUILD_SPEC.md §23.3, persisted to
 * `profiles.preferences` via `PATCH /api/v1/profile` per backend task 3).
 *
 * Theme itself is applied instantly and client-side by `next-themes` /
 * `<ThemeToggle>`; this form's job is only to persist the *chosen* value to
 * the profile so it follows the user across devices, and to own density
 * (which has no client-only equivalent yet).
 */
export function AppearanceForm({ initialDensity }: AppearanceFormProps) {
  const { theme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();

  function persist(patch: { theme?: ThemePreference; density?: DensityPreference }) {
    startTransition(async () => {
      const response = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: patch }),
      });
      const body = (await response.json()) as { success: boolean };
      if (body.success) toast.success('Preference saved');
    });
  }

  return (
    <div className="grid max-w-md gap-8">
      <div className="grid gap-3">
        <Label>Theme</Label>
        <div className="flex gap-2">
          {THEME_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant="outline"
              disabled={isPending}
              className={cn(
                'flex-1 gap-2',
                theme === option.value && 'border-primary text-primary',
              )}
              onClick={() => {
                setTheme(option.value);
                persist({ theme: option.value });
              }}
            >
              <option.icon className="size-4" />
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        <Label>Density</Label>
        <div className="flex gap-2">
          {DENSITY_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant="outline"
              disabled={isPending}
              className={cn(
                'flex-1',
                initialDensity === option.value && 'border-primary text-primary',
              )}
              onClick={() => persist({ density: option.value })}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          Density is saved to your profile now; it starts affecting spacing once the
          data-dense views (tables, chat) arrive in later phases.
        </p>
      </div>
    </div>
  );
}
