import { fileTypeFromBuffer } from 'file-type';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import TurndownService from 'turndown';
import { getExtension } from '@/lib/utils/file';

/**
 * Text extraction, one function per MIME type (MASTER_BUILD_SPEC.md §12.2
 * "Extract" stage, §23.5 backend task 4).
 *
 * The declared extension/`Content-Type` is never trusted for dispatch — the
 * magic-byte sniff via `file-type` is authoritative. `.md`/`.txt` are the one
 * exception `file-type` cannot help with (plain text has no magic bytes), so
 * those two are verified by extension only, same as the spec's own table.
 */

export interface ExtractionResult {
  readonly text: string;
  readonly metadata: Record<string, unknown>;
}

export class UnsupportedFileTypeError extends Error {
  constructor(detail: string) {
    super(`Unsupported or misidentified file: ${detail}`);
    this.name = 'UnsupportedFileTypeError';
  }
}

const turndown = new TurndownService({ headingStyle: 'atx' });

/**
 * `mammoth`'s bundled `.d.ts` (`node_modules/mammoth/lib/index.d.ts`) does
 * not declare `convertToMarkdown`, even though the package genuinely exports
 * it at runtime (`lib/index.js`). This narrow cast calls the real function
 * rather than falling back to `extractRawText`, which would discard the
 * heading structure the chunker (§12.3) depends on entirely.
 */
const mammothWithMarkdown = mammoth as unknown as {
  convertToMarkdown: (input: {
    buffer: Buffer;
  }) => Promise<{ value: string; messages: unknown[] }>;
};

async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return { text: result.text, metadata: { pageCount: result.pages.length } };
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(buffer: Buffer): Promise<ExtractionResult> {
  // `convertToMarkdown`, not `extractRawText` — raw text loses heading
  // structure, which the chunker (§12.3) depends on entirely.
  const result = await mammothWithMarkdown.convertToMarkdown({ buffer });
  return { text: result.value, metadata: { warnings: result.messages.length } };
}

function extractHtml(buffer: Buffer): ExtractionResult {
  const markdown = turndown.turndown(buffer.toString('utf8'));
  return { text: markdown, metadata: {} };
}

function extractPlainText(buffer: Buffer): ExtractionResult {
  return { text: buffer.toString('utf8'), metadata: {} };
}

/**
 * Verifies the buffer's real type by magic bytes, then dispatches to the
 * matching extractor. Throws `UnsupportedFileTypeError` for anything that
 * doesn't match an allowed type — including a renamed executable.
 */
export async function extractText(
  buffer: Buffer,
  declaredFilename: string,
): Promise<ExtractionResult> {
  const extension = getExtension(declaredFilename);
  const sniffed = await fileTypeFromBuffer(buffer);

  if (extension === '.md' || extension === '.txt') {
    // No magic bytes exist for plain text; a sniffed *binary* type here means
    // the file is not what its extension claims.
    if (sniffed) {
      throw new UnsupportedFileTypeError(
        `declared as ${extension} but magic bytes indicate ${sniffed.mime}`,
      );
    }
    return extractPlainText(buffer);
  }

  if (extension === '.pdf') {
    if (sniffed?.mime !== 'application/pdf') {
      throw new UnsupportedFileTypeError(
        `declared as .pdf but magic bytes indicate ${sniffed?.mime ?? 'unknown'}`,
      );
    }
    return extractPdf(buffer);
  }

  if (extension === '.docx') {
    if (
      sniffed?.mime !==
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      throw new UnsupportedFileTypeError(
        `declared as .docx but magic bytes indicate ${sniffed?.mime ?? 'unknown'}`,
      );
    }
    return extractDocx(buffer);
  }

  if (extension === '.html' || extension === '.htm') {
    // HTML is also textual with no reliable magic bytes; a sniffed binary
    // type is still disqualifying.
    if (sniffed) {
      throw new UnsupportedFileTypeError(
        `declared as ${extension} but magic bytes indicate ${sniffed.mime}`,
      );
    }
    return extractHtml(buffer);
  }

  throw new UnsupportedFileTypeError(`extension "${extension}" is not in the allow-list`);
}
