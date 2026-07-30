import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { isConfigured, env } from '@/config/env';
import type { Database } from '@/types/database.types';
import {
  createConversation,
  getConversation,
  renameConversation,
  listConversations,
} from '@/lib/db/queries/conversations.query';
import { insertMessage, listMessages } from '@/lib/db/queries/messages.query';
import {
  insertKbDocument,
  insertKbChunks,
  listKbDocuments,
} from '@/lib/db/queries/kb.query';
import {
  upsertCachedIncident,
  getCachedIncidentByNumber,
} from '@/lib/db/queries/incidents.query';
import { upsertFeedback } from '@/lib/db/queries/feedback.query';
import { insertAuditLog, listAuditLogs } from '@/lib/db/queries/audit.query';

/**
 * Query module integration tests (MASTER_BUILD_SPEC.md §23.4 testing task 2).
 * Requires a live Supabase project — see rls.test.ts for why this is skipped
 * rather than faked in this environment.
 */
const canRun = isConfigured.supabase && Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
const ORG_ID = '00000000-0000-0000-0000-000000000001';

describe.skipIf(!canRun)('query modules', () => {
  let admin: SupabaseClient<Database>;
  let userId: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    admin = createSupabaseClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL!,
      env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data, error } = await admin.auth.admin.createUser({
      email: `queries-test-${Date.now()}@test.local`,
      password: 'QueriesTest#Password1234',
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error('User creation failed');
    userId = data.user.id;
    createdUserIds.push(userId);
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await admin.auth.admin.deleteUser(id).catch(() => undefined);
    }
  });

  it('creates, reads, renames, and lists conversations', async () => {
    const created = await createConversation(admin, {
      orgId: ORG_ID,
      userId,
      surface: 'chat',
    });
    expect(created.user_id).toBe(userId);

    const fetched = await getConversation(admin, created.id);
    expect(fetched?.id).toBe(created.id);

    const renamed = await renameConversation(admin, created.id, 'Renamed conversation');
    expect(renamed.title).toBe('Renamed conversation');

    const list = await listConversations(admin, userId);
    expect(list.some((c) => c.id === created.id)).toBe(true);
  });

  it('inserts and lists messages for a conversation', async () => {
    const conversation = await createConversation(admin, {
      orgId: ORG_ID,
      userId,
      surface: 'chat',
    });
    await insertMessage(admin, {
      conversation_id: conversation.id,
      role: 'user',
      content: 'Hi',
    });
    await insertMessage(admin, {
      conversation_id: conversation.id,
      role: 'assistant',
      content: 'Hello!',
    });

    const messages = await listMessages(admin, conversation.id);
    expect(messages).toHaveLength(2);
    expect(messages[0]?.content).toBe('Hi');
  });

  it('inserts a KB document and its chunks', async () => {
    const doc = await insertKbDocument(admin, {
      org_id: ORG_ID,
      title: `Query test doc ${Date.now()}`,
      status: 'indexed',
    });
    const chunks = await insertKbChunks(admin, [
      {
        document_id: doc.id,
        org_id: ORG_ID,
        chunk_index: 0,
        content: 'chunk one',
        token_count: 2,
      },
    ]);
    expect(chunks).toHaveLength(1);

    const list = await listKbDocuments(admin, ORG_ID);
    expect(list.some((d) => d.id === doc.id)).toBe(true);
  });

  it('upserts a cached incident idempotently', async () => {
    const number = `INC-QUERY-${Date.now()}`;
    const first = await upsertCachedIncident(admin, {
      org_id: ORG_ID,
      sys_id: `sys-${Date.now()}`,
      number,
      short_description: 'first',
      state: 'new',
      raw: {},
    });
    const second = await upsertCachedIncident(admin, {
      org_id: ORG_ID,
      sys_id: first.sys_id,
      number,
      short_description: 'updated',
      state: 'in_progress',
      raw: {},
    });
    expect(second.id).toBe(first.id);
    expect(second.short_description).toBe('updated');

    const fetched = await getCachedIncidentByNumber(admin, ORG_ID, number);
    expect(fetched?.state).toBe('in_progress');
  });

  it('enforces one feedback vote per user per message via upsert', async () => {
    const conversation = await createConversation(admin, {
      orgId: ORG_ID,
      userId,
      surface: 'chat',
    });
    const message = await insertMessage(admin, {
      conversation_id: conversation.id,
      role: 'assistant',
      content: 'Answer',
    });

    await upsertFeedback(admin, {
      org_id: ORG_ID,
      message_id: message.id,
      user_id: userId,
      rating: 'positive',
    });
    const updated = await upsertFeedback(admin, {
      org_id: ORG_ID,
      message_id: message.id,
      user_id: userId,
      rating: 'negative',
    });
    expect(updated.rating).toBe('negative');
  });

  it('writes and lists audit log entries', async () => {
    await insertAuditLog(admin, {
      org_id: ORG_ID,
      action: 'test.query_module',
      resource_type: 'test',
    });
    const list = await listAuditLogs(admin, ORG_ID, { action: 'test.query_module' });
    expect(list.length).toBeGreaterThanOrEqual(1);
  });
});

if (!canRun) {
  describe('query modules (skipped)', () => {
    it('requires a configured Supabase project — see docs/IMPLEMENTATION_OVERRIDE.md', () => {
      expect(canRun).toBe(false);
    });
  });
}
