import { describe, expect, it, vi, beforeEach } from 'vitest';

const { fileTypeFromBufferMock } = vi.hoisted(() => ({
  fileTypeFromBufferMock: vi.fn(),
}));
const { pdfParseGetTextMock, pdfParseDestroyMock } = vi.hoisted(() => ({
  pdfParseGetTextMock: vi.fn(),
  pdfParseDestroyMock: vi.fn(),
}));
const { mammothConvertMock } = vi.hoisted(() => ({ mammothConvertMock: vi.fn() }));

vi.mock('file-type', () => ({ fileTypeFromBuffer: fileTypeFromBufferMock }));
vi.mock('pdf-parse', () => ({
  PDFParse: vi.fn().mockImplementation(function PDFParseMock() {
    return { getText: pdfParseGetTextMock, destroy: pdfParseDestroyMock };
  }),
}));
vi.mock('mammoth', () => ({ default: { convertToMarkdown: mammothConvertMock } }));

// Imported after the mocks so the module under test picks them up.
const { extractText, UnsupportedFileTypeError } = await import('@/lib/rag/extraction');

/**
 * Extraction unit tests (MASTER_BUILD_SPEC.md §23.5 testing task 2). External
 * parsing libraries are mocked — this suite verifies dispatch and magic-byte
 * verification, not `pdfjs-dist`/`mammoth`'s own correctness.
 */
describe('extractText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts plain text for .txt files', async () => {
    fileTypeFromBufferMock.mockResolvedValue(undefined);
    const result = await extractText(Buffer.from('hello world'), 'notes.txt');
    expect(result.text).toBe('hello world');
  });

  it('extracts plain text for .md files', async () => {
    fileTypeFromBufferMock.mockResolvedValue(undefined);
    const result = await extractText(Buffer.from('# Heading\n\nBody'), 'article.md');
    expect(result.text).toBe('# Heading\n\nBody');
  });

  it('converts HTML to markdown via turndown', async () => {
    fileTypeFromBufferMock.mockResolvedValue(undefined);
    const result = await extractText(
      Buffer.from('<h1>Title</h1><p>Body text</p>'),
      'page.html',
    );
    expect(result.text).toContain('Title');
    expect(result.text).toContain('Body text');
  });

  it('extracts PDF text via pdf-parse when magic bytes match', async () => {
    fileTypeFromBufferMock.mockResolvedValue({ mime: 'application/pdf', ext: 'pdf' });
    pdfParseGetTextMock.mockResolvedValue({
      text: 'PDF body text',
      pages: [{ num: 1, text: 'PDF body text' }],
    });

    const result = await extractText(Buffer.from('%PDF-1.4'), 'manual.pdf');
    expect(result.text).toBe('PDF body text');
    expect(pdfParseDestroyMock).toHaveBeenCalled();
  });

  it('converts DOCX to markdown via mammoth when magic bytes match', async () => {
    fileTypeFromBufferMock.mockResolvedValue({
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ext: 'docx',
    });
    mammothConvertMock.mockResolvedValue({
      value: '# Heading\n\nDocx body',
      messages: [],
    });

    const result = await extractText(Buffer.from('PK'), 'report.docx');
    expect(result.text).toBe('# Heading\n\nDocx body');
  });

  it('rejects a .exe renamed to .pdf via magic-byte verification', async () => {
    fileTypeFromBufferMock.mockResolvedValue({
      mime: 'application/x-msdownload',
      ext: 'exe',
    });
    await expect(extractText(Buffer.from('MZ...'), 'totally-a.pdf')).rejects.toThrow(
      UnsupportedFileTypeError,
    );
  });

  it('rejects a .txt file whose magic bytes indicate a binary type', async () => {
    fileTypeFromBufferMock.mockResolvedValue({ mime: 'image/png', ext: 'png' });
    await expect(extractText(Buffer.from('not really text'), 'fake.txt')).rejects.toThrow(
      UnsupportedFileTypeError,
    );
  });

  it('rejects a .docx whose magic bytes do not match', async () => {
    fileTypeFromBufferMock.mockResolvedValue({ mime: 'application/pdf', ext: 'pdf' });
    await expect(extractText(Buffer.from('%PDF-1.4'), 'not-really.docx')).rejects.toThrow(
      UnsupportedFileTypeError,
    );
  });

  it('rejects an extension outside the allow-list', async () => {
    fileTypeFromBufferMock.mockResolvedValue(undefined);
    await expect(extractText(Buffer.from('data'), 'archive.zip')).rejects.toThrow(
      UnsupportedFileTypeError,
    );
  });
});
