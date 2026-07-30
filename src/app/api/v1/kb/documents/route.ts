import { z } from 'zod';
import { createHandler } from '@/lib/api/handler';
import { ContentTooLargeError, ValidationError } from '@/lib/api/errors';
import { createRouteHandlerSupabaseClient } from '@/lib/db/client';
import { insertKbDocument, listKbDocuments } from '@/lib/db/queries/kb.query';
import { enqueue } from '@/lib/jobs/queue';
import { extractText, UnsupportedFileTypeError } from '@/lib/rag/extraction';
import { normaliseText } from '@/lib/rag/normalisation';
import {
  hasAllowedExtension,
  isWithinSizeLimit,
  MAX_KB_DOCUMENT_BYTES,
} from '@/lib/utils/file';

/**
 * `GET /api/v1/kb/documents` (list, any authenticated user) and
 * `POST /api/v1/kb/documents` (upload, admin only) — MASTER_BUILD_SPEC.md
 * §23.5 backend task 9, FR-KB-1.
 */

const uploadFieldsSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  tags: z.string().max(500).optional(), // comma-separated
  visibility: z.enum(['public', 'internal', 'restricted']).default('internal'),
});

export const GET = createHandler({}, async ({ user }) => {
  const supabase = await createRouteHandlerSupabaseClient();
  const docs = await listKbDocuments(supabase, user.orgId);
  return { documents: docs };
});

export const POST = createHandler(
  { requireMinRole: 'admin' },
  async ({ request, user }) => {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      throw new ValidationError([{ path: 'file', message: 'A file is required.' }]);
    }
    if (!isWithinSizeLimit(file.size)) {
      throw new ContentTooLargeError(
        `File is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is ${MAX_KB_DOCUMENT_BYTES / 1024 / 1024} MB.`,
      );
    }
    if (!hasAllowedExtension(file.name)) {
      throw new ValidationError([
        { path: 'file', message: `Unsupported file type for "${file.name}".` },
      ]);
    }

    const fields = uploadFieldsSchema.safeParse({
      title: formData.get('title') ?? file.name,
      description: formData.get('description') ?? undefined,
      category: formData.get('category') ?? undefined,
      tags: formData.get('tags') ?? undefined,
      visibility: formData.get('visibility') ?? 'internal',
    });
    if (!fields.success) {
      throw new ValidationError(
        fields.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let extracted;
    try {
      extracted = await extractText(buffer, file.name);
    } catch (error) {
      if (error instanceof UnsupportedFileTypeError) {
        throw new ValidationError([{ path: 'file', message: error.message }]);
      }
      throw error;
    }

    const supabase = await createRouteHandlerSupabaseClient();
    const document = await insertKbDocument(supabase, {
      org_id: user.orgId,
      title: fields.data.title,
      ...(fields.data.description ? { description: fields.data.description } : {}),
      ...(fields.data.category ? { category: fields.data.category } : {}),
      tags: fields.data.tags
        ? fields.data.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      visibility: fields.data.visibility,
      status: 'uploaded',
      filename: file.name,
      ...(file.type ? { mime_type: file.type } : {}),
      size_bytes: file.size,
      raw_content: normaliseText(extracted.text),
      uploaded_by: user.id,
    });

    await enqueue(supabase, user.orgId, 'document.ingest', { documentId: document.id });

    return { document };
  },
);
