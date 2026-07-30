/**
 * Text normalisation (MASTER_BUILD_SPEC.md §12.2 "Normalise" stage, §23.5
 * backend task 5). Runs after extraction, before chunking. Preserves heading
 * structure (`#`-prefixed lines) untouched — only whitespace, control
 * characters, and Unicode form are normalised.
 */
export function normaliseText(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
