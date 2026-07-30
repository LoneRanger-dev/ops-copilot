import type { JSX } from 'react';
import { parseMarkdown, type MarkdownBlock } from '@/lib/utils/markdown';

/** Renders **bold** and `inline code` spans within a plain paragraph string. */
function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`${keyPrefix}-${index}`} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={`${keyPrefix}-${index}`}
          className="bg-muted rounded px-1.5 py-0.5 font-mono text-[0.85em]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={`${keyPrefix}-${index}`}>{part}</span>;
  });
}

function Block({ block, index }: { block: MarkdownBlock; index: number }) {
  switch (block.type) {
    case 'heading': {
      const sizes: Record<number, string> = {
        1: 'text-2xl font-semibold mt-8 mb-3',
        2: 'text-xl font-semibold mt-7 mb-3',
        3: 'text-lg font-semibold mt-6 mb-2',
        4: 'text-base font-semibold mt-5 mb-2',
        5: 'text-sm font-semibold mt-4 mb-2',
        6: 'text-sm font-medium mt-4 mb-2',
      };
      const Tag = `h${Math.min(block.level, 6)}` as keyof JSX.IntrinsicElements;
      return (
        <Tag
          id={block.id}
          className={`${sizes[block.level] ?? sizes[6]} text-foreground scroll-mt-20`}
        >
          {block.text}
        </Tag>
      );
    }
    case 'code':
      return (
        <pre className="bg-muted my-3 overflow-x-auto rounded-lg p-4 font-mono text-xs">
          <code>{block.text}</code>
        </pre>
      );
    case 'list':
      return (
        <ul className="text-foreground my-2 ml-5 list-disc space-y-1 text-sm">
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item, `li-${index}-${itemIndex}`)}</li>
          ))}
        </ul>
      );
    case 'paragraph':
      return (
        <p className="text-foreground/90 my-2 text-sm leading-relaxed">
          {renderInline(block.text, `p-${index}`)}
        </p>
      );
    default:
      return null;
  }
}

/** Article reader (MASTER_BUILD_SPEC.md §23.5 frontend task 5). */
export function KbArticleReader({ markdown }: { markdown: string }) {
  const blocks = parseMarkdown(markdown);

  if (blocks.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">This article has no content yet.</p>
    );
  }

  return (
    <div>
      {blocks.map((block, index) => (
        <Block key={index} block={block} index={index} />
      ))}
    </div>
  );
}
