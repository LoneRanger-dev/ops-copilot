import type { z } from 'zod';
import type { ApiErrorDetail } from '@/types';
import { ValidationError } from './errors';

/** Convert Zod issues into the API's `ApiErrorDetail[]` shape. */
function toDetails(error: z.ZodError): ApiErrorDetail[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

/**
 * Parse `unknown` input against a Zod schema, throwing `ValidationError`
 * (422, per the error registry) rather than returning a Zod result directly.
 * Route handlers call this instead of `schema.parse` so every validation
 * failure across the API produces an identical envelope.
 */
export function parseOrThrow<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown,
): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(toDetails(result.error));
  }
  return result.data;
}

/** Parse a `Request` JSON body. Throws `ValidationError` on malformed JSON too. */
export async function parseJsonBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ValidationError([
      { path: 'body', message: 'Request body must be valid JSON.' },
    ]);
  }
  return parseOrThrow(schema, raw);
}

/** Parse a `URLSearchParams`-derived query object. */
export function parseQuery<T extends z.ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: T,
): z.infer<T> {
  return parseOrThrow(schema, Object.fromEntries(searchParams.entries()));
}
