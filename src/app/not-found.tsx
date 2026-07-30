import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <p className="text-muted-foreground font-mono text-sm">404</p>
        <h1 className="text-foreground mt-2 text-2xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          That page does not exist, or you do not have access to it.
        </p>
        <Link
          href="/"
          className="bg-primary text-primary-foreground mt-6 inline-flex h-9 items-center rounded-md px-4 text-sm font-medium transition-opacity hover:opacity-90"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
