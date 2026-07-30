import { siteConfig } from '@/config/site';

/**
 * Phase 1 landing page.
 *
 * Confirms the stack renders and both themes resolve. Phase 2 replaces this
 * with a redirect driven by authentication state (section 13.2).
 */

const FOUNDATION = [
  { label: 'Framework', value: 'Next.js 15 · App Router · React 19' },
  { label: 'Language', value: 'TypeScript strict' },
  { label: 'Styling', value: 'Tailwind CSS v4 · CSS-first tokens' },
  { label: 'Data', value: 'Postgres + pgvector · Redis' },
  { label: 'Quality', value: 'ESLint · Prettier · Vitest · Husky' },
] as const;

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl">
        <div className="mb-10">
          <span className="border-border bg-muted text-muted-foreground inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-wide">
            Phase 1 · Repository initialization
          </span>
        </div>

        <h1 className="text-foreground text-4xl font-semibold tracking-tight">
          {siteConfig.name}
        </h1>
        <p className="text-primary mt-2 text-lg font-medium">{siteConfig.tagline}</p>
        <p className="text-muted-foreground mt-4 max-w-xl leading-relaxed">
          {siteConfig.description}
        </p>

        <dl className="border-border mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-[var(--border)] sm:grid-cols-2">
          {FOUNDATION.map((item) => (
            <div key={item.label} className="bg-card px-4 py-3">
              <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {item.label}
              </dt>
              <dd className="text-card-foreground mt-1 text-sm">{item.value}</dd>
            </div>
          ))}
        </dl>

        <div className="border-border mt-8 flex flex-wrap items-center gap-3 border-t pt-6">
          <a
            href="/api/v1/health"
            className="bg-primary text-primary-foreground inline-flex h-9 items-center rounded-md px-4 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Check system health
          </a>
          <span className="text-muted-foreground font-mono text-xs">
            GET /api/v1/health
          </span>
        </div>
      </div>
    </main>
  );
}
