import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { isConfigured, env } from '@/config/env';
import type { Database } from '@/types/database.types';

/**
 * RLS integration tests (MASTER_BUILD_SPEC.md §23.2 testing task 3) — "the
 * highest-value suite in this phase".
 *
 * Requires a live Supabase project (`NEXT_PUBLIC_SUPABASE_URL` +
 * `SUPABASE_SERVICE_ROLE_KEY`), which a fresh clone does not have under the
 * hackathon portability override (docs/IMPLEMENTATION_OVERRIDE.md — Docker
 * removed, so there is no local Postgres/Supabase stack to test against).
 * The suite is skipped, not deleted or faked, so it runs for real the moment
 * a project is configured — exactly what §17 asks of an integration test.
 */
const canRun = isConfigured.supabase && Boolean(env.SUPABASE_SERVICE_ROLE_KEY);

describe.skipIf(!canRun)('Row-Level Security: organizations & profiles', () => {
  let admin: SupabaseClient<Database>;
  let userAClient: SupabaseClient<Database>;
  let userBClient: SupabaseClient<Database>;
  let staffClient: SupabaseClient<Database>;
  let adminUserClient: SupabaseClient<Database>;
  const password = 'RlsTest#Password1234';
  const createdUserIds: string[] = [];

  async function createConfirmedUser(email: string, role: string) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error('User creation failed');
    createdUserIds.push(data.user.id);

    if (role !== 'end_user') {
      const { error: updateError } = await admin
        .from('profiles')
        .update({ role: role as never })
        .eq('id', data.user.id);
      if (updateError) throw updateError;
    }

    const client = createSupabaseClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL!,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw signInError;
    return client;
  }

  beforeAll(async () => {
    admin = createSupabaseClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL!,
      env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );

    const suffix = Date.now();
    userAClient = await createConfirmedUser(
      `rls-user-a-${suffix}@test.local`,
      'end_user',
    );
    userBClient = await createConfirmedUser(
      `rls-user-b-${suffix}@test.local`,
      'end_user',
    );
    staffClient = await createConfirmedUser(
      `rls-staff-${suffix}@test.local`,
      'support_engineer',
    );
    adminUserClient = await createConfirmedUser(
      `rls-admin-${suffix}@test.local`,
      'admin',
    );
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await admin.auth.admin.deleteUser(id).catch(() => undefined);
    }
  });

  it('lets a user read their own profile', async () => {
    const { data: user } = await userAClient.auth.getUser();
    const { data, error } = await userAClient
      .from('profiles')
      .select('*')
      .eq('id', user.user!.id)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.id).toBe(user.user!.id);
  });

  it('does not let an ordinary user read another user profile', async () => {
    const { data: userB } = await userBClient.auth.getUser();
    const { data } = await userAClient
      .from('profiles')
      .select('*')
      .eq('id', userB.user!.id)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it('lets staff (support_engineer) read any profile in the org', async () => {
    const { data: userA } = await userAClient.auth.getUser();
    const { data, error } = await staffClient
      .from('profiles')
      .select('*')
      .eq('id', userA.user!.id)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.id).toBe(userA.user!.id);
  });

  it('lets an admin read every profile in the org', async () => {
    const { data, error } = await adminUserClient.from('profiles').select('*');
    expect(error).toBeNull();
    expect(data?.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  it('returns nothing to an unauthenticated client', async () => {
    const anon = createSupabaseClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL!,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await anon.from('profiles').select('*');
    expect(data ?? []).toHaveLength(0);
  });

  it('rejects a user attempting to change their own role', async () => {
    const { data: userA } = await userAClient.auth.getUser();
    const { data, error } = await userAClient
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userA.user!.id)
      .select();
    // WITH CHECK rejects the row: either an error, or zero rows updated.
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it('confirms the role did not change after the rejected update', async () => {
    const { data: userA } = await userAClient.auth.getUser();
    const { data } = await userAClient
      .from('profiles')
      .select('role')
      .eq('id', userA.user!.id)
      .single();
    expect(data?.role).toBe('end_user');
  });

  it('lets a user read their own organization', async () => {
    const { data, error } = await userAClient.from('organizations').select('*');
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(1);
  });
});

if (!canRun) {
  describe('Row-Level Security (skipped)', () => {
    it('requires a configured Supabase project — see docs/IMPLEMENTATION_OVERRIDE.md', () => {
      expect(canRun).toBe(false);
    });
  });
}
