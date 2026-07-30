import { isConfigured } from '@/config/env';
import { createHandler } from '@/lib/api/handler';
import { parseJsonBody } from '@/lib/api/validation';
import { createRouteHandlerSupabaseClient } from '@/lib/db/client';
import { updateProfile } from '@/lib/db/queries/users.query';
import { demoUpdateProfile } from '@/lib/auth/demo-store';
import { profileUpdateSchema } from '@/lib/auth/schemas';
import { parsePreferences } from '@/config/constants';

/**
 * `PATCH /api/v1/profile` — display name, department, and theme/density
 * preferences (MASTER_BUILD_SPEC.md §23.3 backend task 2).
 *
 * Any authenticated user may update their own profile; there is no
 * `requireMinRole` because every role owns exactly one profile row and
 * cannot address anyone else's — enforced independently by RLS
 * (`profile_update_own`, §11.4) in Supabase mode.
 */
export const PATCH = createHandler({}, async ({ request, user }) => {
  const body = await parseJsonBody(request, profileUpdateSchema);

  // Built with conditional spreads, not a direct pass-through of `body` —
  // zod's `.optional()` types each field as `T | undefined`, which is not
  // assignable to the target types' plain `?: T` under
  // `exactOptionalPropertyTypes` (that flag forbids an *explicit* `undefined`
  // on an optional property, only allowing the key to be absent).
  const preferencesPatch = body.preferences
    ? {
        theme: body.preferences.theme ?? user.preferences.theme,
        density: body.preferences.density ?? user.preferences.density,
      }
    : undefined;

  if (isConfigured.supabase) {
    const supabase = await createRouteHandlerSupabaseClient();
    const updated = await updateProfile(supabase, user.id, {
      ...(body.fullName !== undefined ? { full_name: body.fullName } : {}),
      ...(body.department !== undefined ? { department: body.department } : {}),
      ...(preferencesPatch ? { preferences: preferencesPatch } : {}),
    });

    return {
      fullName: updated.full_name,
      department: updated.department,
      preferences: parsePreferences(updated.preferences),
    };
  }

  const updated = demoUpdateProfile(user.id, {
    ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
    ...(body.department !== undefined ? { department: body.department } : {}),
    ...(preferencesPatch ? { preferences: preferencesPatch } : {}),
  });
  if (!updated) throw new Error('Profile not found.');

  return {
    fullName: updated.fullName,
    department: updated.department,
    preferences: updated.preferences,
  };
});
