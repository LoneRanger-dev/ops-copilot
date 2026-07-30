/**
 * Root loading skeleton.
 *
 * A skeleton matching the final layout's dimensions, never a bare spinner
 * (section 7.7).
 */
export default function Loading() {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-16"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="w-full max-w-2xl animate-pulse">
        <div className="bg-muted h-6 w-56 rounded-full" />
        <div className="bg-muted mt-10 h-10 w-72 rounded-md" />
        <div className="bg-muted mt-3 h-6 w-48 rounded-md" />
        <div className="bg-muted mt-4 h-4 w-full rounded-md" />
        <div className="bg-muted mt-2 h-4 w-4/5 rounded-md" />
        <div className="border-border mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-[var(--border)] sm:grid-cols-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="bg-card px-4 py-3">
              <div className="bg-muted h-3 w-20 rounded" />
              <div className="bg-muted mt-2 h-4 w-40 rounded" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
