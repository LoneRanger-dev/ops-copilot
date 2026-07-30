import { describe, expect, it } from 'vitest';
import { chunkDocument, buildEmbeddingInput } from '@/lib/rag/chunking';
import { countTokens } from '@/lib/ai/context/token-counter';
import { CHUNK_CONFIG } from '@/config/rag';

/**
 * Chunking unit tests (MASTER_BUILD_SPEC.md §23.5 testing task 1 — "the
 * most important test file this phase"). At least 12 cases (DoD).
 */
describe('chunkDocument', () => {
  it('handles an empty document without throwing', () => {
    expect(chunkDocument('')).toEqual([]);
    expect(chunkDocument('   \n\n  ')).toEqual([]);
  });

  it('handles a document with no headings as a single section', () => {
    const chunks = chunkDocument('Just a plain paragraph with no structure at all.');
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.headingPath).toEqual([]);
  });

  it('splits on headings and records the correct heading_path', () => {
    const doc = [
      '# Networking',
      '',
      '## VPN',
      '',
      '### Troubleshooting',
      '',
      'The VPN client disconnects when idle for too long. '.repeat(10),
    ].join('\n');

    const chunks = chunkDocument(doc);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[chunks.length - 1]?.headingPath).toEqual([
      'Networking',
      'VPN',
      'Troubleshooting',
    ]);
  });

  it('tracks separate heading paths for sibling sections with enough content', () => {
    const bigParagraph = (label: string) => `${label} content. `.repeat(400);
    const doc = [
      '# Guide',
      '',
      '## First Topic',
      '',
      bigParagraph('first'),
      '',
      '## Second Topic',
      '',
      bigParagraph('second'),
    ].join('\n');

    const chunks = chunkDocument(doc);
    const paths = chunks.map((c) => c.headingPath.join('>'));
    expect(paths).toContain('Guide>First Topic');
    expect(paths).toContain('Guide>Second Topic');
  });

  it('respects the target token size for a section that must be split', () => {
    const longSection = 'This is one sentence about VPN troubleshooting steps. '.repeat(
      500,
    );
    const doc = `# Big Section\n\n${longSection}`;

    const chunks = chunkDocument(doc);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      // Overlap can push slightly over target; the hard ceiling is maxTokens.
      expect(chunk.tokenCount).toBeLessThanOrEqual(CHUNK_CONFIG.maxTokens);
    }
  });

  it('applies overlap between adjacent chunks split from the same section', () => {
    const longSection = Array.from(
      { length: 150 },
      (_, i) =>
        `Paragraph number ${i} about VPN configuration and troubleshooting steps in detail.`,
    ).join('\n\n');
    const doc = `# Section\n\n${longSection}`;

    const chunks = chunkDocument(doc);
    expect(chunks.length).toBeGreaterThan(1);

    // The start of chunk N+1 should share trailing text with the end of chunk N.
    const firstChunkTail = chunks[0]!.content.slice(-40);
    const secondChunkHead = chunks[1]!.content.slice(0, 200);
    const tailWords = firstChunkTail.trim().split(/\s+/).slice(-3).join(' ');
    expect(secondChunkHead).toContain(tailWords.split(' ')[0]);
  });

  it('never splits a fenced code block, even when it exceeds the target', () => {
    const hugeCode = [
      '```bash',
      ...Array.from({ length: 300 }, (_, i) => `echo "line ${i}"`),
      '```',
    ].join('\n');
    const doc = `# Runbook\n\nRun the following script end to end.\n\n${hugeCode}\n\nThat completes the task.`;

    const chunks = chunkDocument(doc);
    const codeChunk = chunks.find((c) => c.content.includes('```bash'));
    expect(codeChunk).toBeDefined();
    expect(codeChunk!.content).toContain('echo "line 0"');
    expect(codeChunk!.content).toContain('echo "line 299"');
    expect(codeChunk!.content.trim().endsWith('```')).toBe(true);
  });

  it('does not mistake a "#" inside a fenced code block for a heading', () => {
    const doc = [
      '# Real Heading',
      '',
      '```python',
      '# this is a python comment, not a heading',
      'x = 1',
      '```',
    ].join('\n');
    const chunks = chunkDocument(doc);
    expect(
      chunks.every(
        (c) =>
          c.headingPath[c.headingPath.length - 1] !==
          'this is a python comment, not a heading',
      ),
    ).toBe(true);
  });

  it('merges a section under CHUNK_MIN_TOKENS with its sibling', () => {
    const doc = [
      '# Guide',
      '',
      '## Intro',
      '',
      'Short.',
      '',
      '## Main Content',
      '',
      'This section has enough real content to stay well above the minimum chunk token threshold on its own. '.repeat(
        10,
      ),
    ].join('\n');

    const chunks = chunkDocument(doc);
    // The tiny "Intro" section should not survive as its own separate chunk.
    expect(chunks.some((c) => c.content === 'Short.')).toBe(false);
  });

  it('prepends the heading path before embedding, not in stored content', () => {
    const doc = '# Networking\n\n## VPN\n\nSome VPN content here.';
    const chunks = chunkDocument(doc);
    const chunk = chunks[0]!;

    expect(chunk.content).not.toContain('Networking > VPN');
    const embeddingInput = buildEmbeddingInput(chunk);
    expect(embeddingInput.startsWith('Networking > VPN\n\n')).toBe(true);
  });

  it('does not prepend a heading path when there are no headings', () => {
    const chunks = chunkDocument('No headings anywhere in this document.');
    expect(buildEmbeddingInput(chunks[0]!)).toBe(chunks[0]!.content);
  });

  it('produces a roughly sensible chunk count for a long multi-section document', () => {
    const section = (title: string) =>
      `## ${title}\n\n${'Detailed troubleshooting content for this topic. '.repeat(200)}`;
    const doc = ['# Manual', section('Alpha'), section('Beta'), section('Gamma')].join(
      '\n\n',
    );

    const totalTokens = countTokens(doc);
    const chunks = chunkDocument(doc);

    expect(chunks.length).toBeGreaterThan(1);
    // Rough expectation from the spec's acceptance criterion: tokens / 800.
    const expected = Math.ceil(totalTokens / CHUNK_CONFIG.targetTokens);
    expect(chunks.length).toBeGreaterThanOrEqual(Math.max(1, expected - 2));
  });

  it('gives every chunk a non-negative, non-zero token count', () => {
    const doc = '# A\n\nSome content.\n\n## B\n\nMore content here for the second part.';
    const chunks = chunkDocument(doc);
    for (const chunk of chunks) {
      expect(chunk.tokenCount).toBeGreaterThan(0);
    }
  });
});
