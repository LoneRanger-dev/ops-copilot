import { countTokens, takeTrailingTokens } from '@/lib/ai/context/token-counter';
import { CHUNK_CONFIG } from '@/config/rag';

/**
 * Recursive, heading-aware chunking (MASTER_BUILD_SPEC.md §12.3). The
 * highest-leverage file in Phase 5 — see `docs/RAG.md` for the full
 * rationale. Every step below is numbered to match the spec's own list.
 */

export interface Chunk {
  readonly headingPath: readonly string[];
  readonly content: string;
  readonly tokenCount: number;
}

interface Section {
  headingPath: string[];
  content: string;
}

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/;
const FENCE_RE = /^(`{3,}|~{3,})/;

function sameParent(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  return a.slice(0, -1).join('\u0000') === b.slice(0, -1).join('\u0000');
}

/** Step 1: split on markdown headings, tracking the full heading path. */
function parseSections(text: string): Section[] {
  const lines = text.split('\n');
  const sections: Section[] = [{ headingPath: [], content: '' }];
  const stack: { level: number; title: string }[] = [];
  let insideFence = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const fenceMatch = FENCE_RE.exec(trimmed);
    if (fenceMatch) insideFence = !insideFence;

    const headingMatch = !insideFence && !fenceMatch ? HEADING_RE.exec(line) : null;

    if (headingMatch) {
      const level = headingMatch[1]!.length;
      const title = headingMatch[2]!;
      while (stack.length > 0 && stack[stack.length - 1]!.level >= level) stack.pop();
      stack.push({ level, title });
      sections.push({ headingPath: stack.map((s) => s.title), content: '' });
    } else {
      sections[sections.length - 1]!.content += `${line}\n`;
    }
  }

  return sections.filter((s) => s.content.trim().length > 0);
}

/** Step 3: merge a section under `minTokens` with the next sibling sharing its parent heading. */
function mergeSmallSections(sections: Section[]): Section[] {
  const merged: Section[] = [];

  for (const section of sections) {
    const previous = merged[merged.length - 1];
    const sectionTokens = countTokens(section.content);

    if (
      previous &&
      sectionTokens < CHUNK_CONFIG.minTokens &&
      sameParent(previous.headingPath, section.headingPath)
    ) {
      previous.content = `${previous.content}\n\n${section.content}`;
      previous.headingPath = section.headingPath; // the more specific/later heading wins
      continue;
    }

    merged.push({ headingPath: [...section.headingPath], content: section.content });
  }

  // A small trailing section merges backward if nothing followed it to merge forward into.
  if (merged.length > 1) {
    const last = merged[merged.length - 1]!;
    const beforeLast = merged[merged.length - 2]!;
    if (
      countTokens(last.content) < CHUNK_CONFIG.minTokens &&
      sameParent(beforeLast.headingPath, last.headingPath)
    ) {
      beforeLast.content = `${beforeLast.content}\n\n${last.content}`;
      beforeLast.headingPath = last.headingPath;
      merged.pop();
    }
  }

  return merged;
}

type Unit = { type: 'code' | 'text'; content: string };

/** Groups lines into fenced-code-block units (atomic, never split) and paragraph units. */
function segmentIntoUnits(text: string): Unit[] {
  const units: Unit[] = [];
  const lines = text.split('\n');
  let buffer: string[] = [];
  let insideFence = false;
  let codeBuffer: string[] = [];

  function flushTextBuffer() {
    const joined = buffer.join('\n');
    for (const paragraph of joined.split(/\n{2,}/)) {
      if (paragraph.trim().length > 0) units.push({ type: 'text', content: paragraph });
    }
    buffer = [];
  }

  for (const line of lines) {
    const isFenceLine = FENCE_RE.test(line.trim());

    if (isFenceLine && !insideFence) {
      flushTextBuffer();
      insideFence = true;
      codeBuffer = [line];
    } else if (isFenceLine && insideFence) {
      codeBuffer.push(line);
      units.push({ type: 'code', content: codeBuffer.join('\n') });
      codeBuffer = [];
      insideFence = false;
    } else if (insideFence) {
      codeBuffer.push(line);
    } else {
      buffer.push(line);
    }
  }

  if (insideFence) units.push({ type: 'code', content: codeBuffer.join('\n') }); // unterminated fence
  flushTextBuffer();

  return units;
}

/** Step 2 (fallback): splits an over-budget paragraph on progressively finer separators. */
function splitLongText(text: string, targetTokens: number): string[] {
  if (countTokens(text) <= targetTokens) return [text];

  for (const separator of ['\n', '. ', ' '] as const) {
    const parts = text.split(separator).filter((p) => p.length > 0);
    if (parts.length <= 1) continue;

    const pieces: string[] = [];
    let current = '';
    for (const part of parts) {
      const candidate = current ? `${current}${separator}${part}` : part;
      if (countTokens(candidate) > targetTokens && current) {
        pieces.push(current);
        current = part;
      } else {
        current = candidate;
      }
    }
    if (current) pieces.push(current);

    // Recurse on any piece still over budget (finer separator).
    return pieces.flatMap((piece) =>
      countTokens(piece) > targetTokens ? splitLongText(piece, targetTokens) : [piece],
    );
  }

  // No separator helped (single unbroken token stream) — hard-wrap by characters.
  const approxCharsPerToken = 4;
  const maxChars = targetTokens * approxCharsPerToken;
  const hardWrapped: string[] = [];
  for (let i = 0; i < text.length; i += maxChars)
    hardWrapped.push(text.slice(i, i + maxChars));
  return hardWrapped;
}

/** Step 2 + 6: packs atomic units into ~`targetTokens` pieces, never splitting a code unit. */
function packUnits(units: Unit[]): string[] {
  const pieces: string[] = [];
  let current = '';
  let currentTokens = 0;

  function flush() {
    if (current.trim()) pieces.push(current.trim());
    current = '';
    currentTokens = 0;
  }

  for (const unit of units) {
    if (unit.type === 'code') {
      const codeTokens = countTokens(unit.content);
      if (currentTokens > 0 && currentTokens + codeTokens > CHUNK_CONFIG.maxTokens)
        flush();
      current = current ? `${current}\n\n${unit.content}` : unit.content;
      currentTokens += codeTokens;
      if (currentTokens >= CHUNK_CONFIG.targetTokens) flush(); // code block itself may exceed target; that's allowed
      continue;
    }

    const subPieces = splitLongText(unit.content, CHUNK_CONFIG.targetTokens);
    for (const sub of subPieces) {
      const subTokens = countTokens(sub);
      if (currentTokens > 0 && currentTokens + subTokens > CHUNK_CONFIG.targetTokens)
        flush();
      current = current ? `${current}\n\n${sub}` : sub;
      currentTokens += subTokens;
    }
  }
  flush();

  return pieces;
}

/** Step 4: applies token-level overlap between adjacent pieces split from the same section. */
function applyOverlap(pieces: string[]): string[] {
  if (pieces.length <= 1) return pieces;

  return pieces.map((piece, index) => {
    if (index === 0) return piece;
    const overlap = takeTrailingTokens(pieces[index - 1]!, CHUNK_CONFIG.overlapTokens);
    return overlap ? `${overlap}\n\n${piece}` : piece;
  });
}

/**
 * Chunks a normalised markdown document. Returns `[]` for an empty document
 * rather than throwing (§23.5 testing task 1).
 */
export function chunkDocument(text: string): Chunk[] {
  if (!text || !text.trim()) return [];

  const sections = mergeSmallSections(parseSections(text));
  const chunks: Chunk[] = [];

  for (const section of sections) {
    const sectionTokens = countTokens(section.content);
    const pieces =
      sectionTokens <= CHUNK_CONFIG.targetTokens
        ? [section.content.trim()]
        : applyOverlap(packUnits(segmentIntoUnits(section.content)));

    for (const piece of pieces) {
      if (!piece.trim()) continue;
      chunks.push({
        headingPath: section.headingPath,
        content: piece.trim(),
        tokenCount: countTokens(piece),
      });
    }
  }

  return chunks;
}

/**
 * Step 5: "the highest-leverage detail in the entire pipeline" — the text
 * actually sent to the embedding model, never what's stored in `content`.
 */
export function buildEmbeddingInput(
  chunk: Pick<Chunk, 'headingPath' | 'content'>,
): string {
  return chunk.headingPath.length > 0
    ? `${chunk.headingPath.join(' > ')}\n\n${chunk.content}`
    : chunk.content;
}
