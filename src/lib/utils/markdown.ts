/**
 * Minimal markdown → block parser (MASTER_BUILD_SPEC.md §23.5 frontend
 * task 5 — article reader with a table of contents). Deliberately not a
 * general-purpose markdown library: KB articles are chunked/authored
 * markdown with a known, narrow feature set (headings, paragraphs, fenced
 * code, bullet lists), and a small dependency-free parser keeps the reader
 * consistent with this repo's existing "no new dependency without a
 * concrete need" pattern.
 */

export type MarkdownBlock =
  | { type: 'heading'; level: number; text: string; id: string }
  | { type: 'paragraph'; text: string }
  | { type: 'code'; lang: string; text: string }
  | { type: 'list'; items: string[] };

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.split('\n');
  const blocks: MarkdownBlock[] = [];
  const usedIds = new Set<string>();

  let i = 0;
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];

  function flushParagraph() {
    if (paragraphBuffer.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraphBuffer.join(' ').trim() });
      paragraphBuffer = [];
    }
  }
  function flushList() {
    if (listBuffer.length > 0) {
      blocks.push({ type: 'list', items: [...listBuffer] });
      listBuffer = [];
    }
  }

  while (i < lines.length) {
    const line = lines[i]!;
    const trimmed = line.trim();

    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    const fenceMatch = /^```(\w*)/.exec(trimmed);
    const listMatch = /^[-*]\s+(.+)$/.exec(trimmed);

    if (fenceMatch) {
      flushParagraph();
      flushList();
      const lang = fenceMatch[1] ?? '';
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i]!.trim())) {
        codeLines.push(lines[i]!);
        i += 1;
      }
      blocks.push({ type: 'code', lang, text: codeLines.join('\n') });
      i += 1; // skip closing fence
      continue;
    }

    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1]!.length;
      const text = headingMatch[2]!.trim();
      let id = slugifyHeading(text) || `heading-${blocks.length}`;
      let suffix = 2;
      while (usedIds.has(id)) {
        id = `${slugifyHeading(text)}-${suffix}`;
        suffix += 1;
      }
      usedIds.add(id);
      blocks.push({ type: 'heading', level, text, id });
      i += 1;
      continue;
    }

    if (listMatch) {
      flushParagraph();
      listBuffer.push(listMatch[1]!.trim());
      i += 1;
      continue;
    }

    if (trimmed === '') {
      flushParagraph();
      flushList();
      i += 1;
      continue;
    }

    flushList();
    paragraphBuffer.push(trimmed);
    i += 1;
  }

  flushParagraph();
  flushList();

  return blocks;
}
