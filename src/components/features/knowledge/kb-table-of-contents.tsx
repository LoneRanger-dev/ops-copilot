'use client';

import { parseMarkdown } from '@/lib/utils/markdown';
import { cn } from '@/lib/utils/cn';

/** Sticky table of contents, generated from the article's own headings (§23.5 frontend task 5). */
export function KbTableOfContents({ markdown }: { markdown: string }) {
  const headings = parseMarkdown(markdown).filter((b) => b.type === 'heading');

  if (headings.length === 0) return null;

  return (
    <nav aria-label="Table of contents" className="hidden lg:block">
      <div className="sticky top-20">
        <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
          On this page
        </p>
        <ul className="flex flex-col gap-1.5 border-l text-sm">
          {headings.map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className={cn(
                  'text-muted-foreground hover:text-foreground block border-l-2 border-transparent py-0.5 pl-3 transition-colors hover:border-current',
                  heading.level <= 2 ? 'font-medium' : 'pl-6 text-xs',
                )}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
