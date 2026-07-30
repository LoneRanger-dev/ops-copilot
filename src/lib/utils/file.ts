/**
 * File validation helpers (MASTER_BUILD_SPEC.md §12.2 "Validate" stage,
 * FR-KB-1). Extension allow-list and size ceiling only — the authoritative
 * type check is the magic-byte sniff in `lib/rag/extraction.ts`, since a
 * declared extension or `Content-Type` header is attacker-controlled.
 */

export const MAX_KB_DOCUMENT_BYTES = 25 * 1024 * 1024; // 25 MB, FR-KB-1

export const ALLOWED_KB_EXTENSIONS = [
  '.md',
  '.txt',
  '.pdf',
  '.docx',
  '.html',
  '.htm',
] as const;
export type AllowedKbExtension = (typeof ALLOWED_KB_EXTENSIONS)[number];

export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? '' : filename.slice(dot).toLowerCase();
}

export function hasAllowedExtension(filename: string): boolean {
  return (ALLOWED_KB_EXTENSIONS as readonly string[]).includes(getExtension(filename));
}

export function isWithinSizeLimit(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= MAX_KB_DOCUMENT_BYTES;
}
