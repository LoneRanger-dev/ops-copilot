# ADR 0005 — Demo-mode authentication when Supabase is not configured

- **Status:** Accepted
- **Date:** 2026-07-30
- **Phase:** 2
- **Specification:** MASTER_BUILD_SPEC.md §23.2; overridden by
  `docs/IMPLEMENTATION_OVERRIDE.md`

## Context

Phase 1's portability override inverted `src/config/env.ts` so
`OPENAI_API_KEY` is the only variable a fresh clone must supply — Supabase,
Postgres, and Redis are all optional. Phase 1 also removed Docker entirely, so
there is no local container runtime available to run `supabase start` (which
itself depends on Docker) against.

Phase 2 requires working authentication: sign-up, sign-in, RBAC, RLS,
MFA, password reset. Supabase Auth is the specified backend (assumption
A-10), but a hackathon judge cloning the repository has no Supabase project
and no way to stand one up locally under the override's constraints.

## Decision

Implement Supabase Auth in full — `@supabase/ssr` client construction (three
distinct constructions for browser, Server Component, and Route
Handler/Server Action contexts per §23.2 backend task 2), the complete RLS
policy set on `organizations` and `profiles`, and native Supabase MFA
(`auth.mfa.enroll`/`challengeAndVerify`) — **and**, in parallel, a demo-mode
authentication path that activates automatically when
`isConfigured.supabase` is `false`:

- `src/lib/auth/demo-store.ts` — an in-memory user store seeded with the four
  personas from §2.3 (Priya/end_user, Marcus/support_engineer,
  Dana/manager, Sam/admin), password-hashed with `node:crypto` `scrypt`.
- `src/lib/auth/demo-session.ts` — HMAC-SHA256-signed session cookies via Web
  Crypto (`crypto.subtle`), chosen specifically because it runs unchanged in
  both the Node runtime (Server Actions) and the Edge runtime (middleware)
  without a JWT library dependency.
- `src/lib/auth/mfa.ts` — TOTP enrolment/verification via `otpauth`, with an
  inline SVG QR code via `qrcode`, mirroring what Supabase's native MFA
  provides in the configured path.

`src/lib/auth/server.ts` is the single branch point (`getSession`,
`requireUser`, `requireRole`); every other module — pages, `<RoleGate>`,
Server Actions — is unaware which backend answered the call.

## Rationale

**This is not a placeholder.** Both paths are fully implemented, tested where
testable, and structurally identical from the caller's perspective. Demo mode
is a second real implementation of the same interface, not a stub that
returns fixed data — signing up, signing in, enrolling MFA, and resetting a
password all work end-to-end without any external service beyond OpenAI.

**Docker's absence is upstream, not a new decision.** This ADR does not
reopen deviation 008 (Docker removal); it is the direct consequence of it
reaching Phase 2's first backend-dependent feature.

**The security boundary is unaffected.** RLS is still the layer that
"actually matters" (§16.7) — it simply cannot be exercised without a live
Postgres instance behind it. `src/__tests__/integration/db/rls.test.ts` is
written to run for real against a configured Supabase project and is only
skipped (with an explicit, visible reason) when one is absent, rather than
being deleted, faked, or replaced with a mock.

**RLS policies are co-located with the migration that creates their table**,
rather than deferred to a single `014_rls.sql` per §11.3's migration
sequence table, because `organizations` and `profiles` are the only tables
that exist in Phase 2 — a consolidated file at position 014 cannot be created
before positions 005–013 exist. Every later phase's tables follow the same
per-table pattern, so no table is ever created with RLS enabled and zero
policies for longer than the migration that creates it.

## Consequences

- A fresh clone with only `OPENAI_API_KEY` set can sign up, sign in as any of
  the four demo personas (`src/lib/auth/demo-store.ts` documents their
  emails and shared password), exercise MFA end-to-end, and reset a
  password — every Phase 2 acceptance criterion is demonstrable without
  Supabase.
- Demo-mode user data is in-memory and does not survive a process restart.
  This is acceptable for a hackathon demo (personas reseed deterministically
  on boot) and is documented as NOT a substitute for Postgres once a project
  is configured.
- `DEMO_AUTH_SECRET` is added to `src/config/env.ts` (optional, defaulted,
  following the exact pattern of the existing `CRON_SECRET`), and is rejected
  at boot if `NODE_ENV=production` and Supabase is still unconfigured.
- The moment `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  are set, every code path in this ADR switches to the Supabase
  implementation automatically — no code change, no flag flip beyond setting
  the environment variables.
