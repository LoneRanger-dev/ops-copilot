# Architecture

Living architecture record for **OpsCopilot** — Enterprise AI-powered IT
Application Maintenance Assistant.

Updated at every phase boundary (Build Rule 10). The authoritative specification
is `MASTER_BUILD_SPEC.md` at the repository root; this document records what has
actually been built and where reality diverged from the specification.

**Current phase: 1 of 12 — Repository Initialization (complete).**

---

## 1. Architectural style

Modular monolith inside a single Next.js 15 App Router application, deployed as
one unit (assumption A-25, ADR [0001](decisions/0001-modular-monolith.md)).

Dependencies point inward only:

```
app/          Routes, pages, layouts, handlers    -> may import 3, 2, 1
components/   React components                    -> may import 2, 1
lib/          Agents, RAG, services, integrations -> may import 1
types/ config/ constants/                         -> imports nothing internal
```

`eslint-plugin-boundaries` is installed. Layer rules are activated in Phase 3,
when `components/` first exists — enforcing them against an empty tree in Phase 1
would be configuration without effect.

---

## 2. What exists after Phase 1

| Area            | State                                                               |
| --------------- | ------------------------------------------------------------------- |
| Framework       | Next.js 15 App Router, React 19, TypeScript strict                  |
| Styling         | Tailwind CSS v4, CSS-first tokens, no `tailwind.config.ts`          |
| Design tokens   | Full section 7.6 palette, light + dark, severity scale              |
| Fonts           | Inter (UI) + JetBrains Mono (code), self-hosted via `next/font`     |
| Configuration   | `src/config/{env,site,ai,constants}.ts`, Zod-validated, fail-fast   |
| Observability   | Structured JSON logger with automatic secret redaction              |
| API             | `GET /api/v1/health` reporting Postgres + Redis                     |
| Local infra     | None required. Runs on Node alone.                                  |
| Quality gates   | ESLint, Prettier, Vitest, Husky pre-commit and pre-push             |
| Folder skeleton | Complete section 13.2 tree, `.gitkeep` in every not-yet-used folder |

Not yet built: authentication (Phase 2), UI shell (Phase 3), database schema
(Phase 4), and everything downstream.

---

## 3. Runtime model

| Concern          | Runtime | Reason                                     |
| ---------------- | ------- | ------------------------------------------ |
| Pages, layouts   | Node.js | Database access, secrets                   |
| `/api/v1/health` | Node.js | `pg` and `ioredis` are not Edge-compatible |

`next.config.ts` sets `serverExternalPackages: ['pg', 'ioredis']` so those native
modules are not bundled into the server build.

---

## 4. Configuration layer

`src/config/env.ts` is **server-only**. Next.js inlines only `NEXT_PUBLIC_*`
variables into the browser bundle, so importing that module from a Client
Component would leave every other value `undefined` and throw during hydration.

Client-safe values therefore live in `src/config/site.ts`, which reads
`NEXT_PUBLIC_*` directly and never imports `env.ts`. This split is deliberate and
should be preserved.

Validation runs at module load and throws on a missing or malformed required
variable — the failure is loud by design (section 14.2). `npm run check:env`
performs the same validation ahead of boot with a friendlier message.

---

## 5. Security posture after Phase 1

- Security headers on every response: `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`,
  `Strict-Transport-Security`. Full CSP arrives in Phase 11.
- `poweredByHeader` disabled.
- Logger redacts any field whose name matches `password`, `token`, `secret`,
  `apikey`, `authorization`, `cookie`, `credential`, `privatekey`, or
  `service_role`, case- and separator-insensitive, recursively to depth 6.
- ESLint blocks importing `lib/db/admin` (the RLS-bypassing service-role client)
  outside the three sanctioned call sites (section 16.6). The rule is live now
  so it cannot be forgotten when that module is created in Phase 2.
- `@typescript-eslint/no-explicit-any` is an error.
- `.env.example` is committed; `.env.local` is git-ignored.

---

## 5a. Portability contract (hackathon implementation override)

The repository is cloned onto an unfamiliar machine and must run immediately:

```
git clone && npm install && cp .env.example .env.local && npm run dev
```

Two consequences shape the code:

**`OPENAI_API_KEY` is the only required variable.** Everything else in
`src/config/env.ts` carries a working default. Supabase, Postgres, and Redis are
typed optional (`| undefined`), and `isConfigured` exposes which are present so
consuming code branches rather than assumes. This is a deliberate inversion of
section 14.2's schema, which marked seven variables required.

**No container runtime.** `Dockerfile`, `docker-compose.yml`, and `.dockerignore`
were written during Phase 1 and then removed under the override. Docker is
recorded as a Future Enhancement in the README. The application is stateless and
containerises cleanly whenever that is wanted again.

`GET /api/v1/health` reports unconfigured infrastructure as `not_configured`
rather than `down`, because a fresh clone having neither Postgres nor Redis is a
supported state. Only configured-but-unreachable is a failure. Postgres becomes
a hard dependency in Phase 4, at which point `overallStatus()` gains a `down`
branch.

---

## 6. Deviations from MASTER_BUILD_SPEC section 6.1

Section 6.1 carries a standing Phase 1 obligation: run `npm install`, confirm
every package resolves, record the resolved versions, and **update the table if
the registry has moved** — without loosening a pin to force an install.

Five deviations were required. Each was resolved to the latest compatible stable
version, and each is also recorded in the Open Decisions Log (section 25).

| #   | Package              | Spec §6.1 | Installed | Why                                                                                                                                                                                                                                   |
| --- | -------------------- | --------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `ai`                 | `5.0.0`   | `5.0.223` | The pre-existing tree held `ai@4.3.16` — AI SDK **v4**. Section 7.5 and Phase 7 use v5-only APIs (`createUIMessageStreamResponse`, `toUIMessageStream`, `convertToModelMessages`, `isStepCount`). Corrected to v5.                    |
| 2   | `@ai-sdk/openai`     | `2.0.0`   | `2.0.117` | Matching provider for AI SDK v5. `2.0.0` exactly is superseded; latest 2.x installed.                                                                                                                                                 |
| 3   | `zod`                | `3.24.1`  | `3.25.76` | **The specified combination is impossible.** `@ai-sdk/openai@2` declares `peer zod@^3.25.76 \|\| ^4.1.8`. Pinning `3.24.1` alongside AI SDK v5 cannot resolve. Bumped to the lowest zod satisfying the peer.                          |
| 4   | `react`, `react-dom` | `19.1.0`  | `19.2.8`  | `@ai-sdk/react@2` declares `peer react@^18 \|\| ~19.1.2 \|\| ^19.2.1`; `19.1.0` satisfies none. Bumped now so Phase 7 is not blocked, rather than discovering it there.                                                               |
| 5   | `pg`                 | absent    | `8.22.0`  | **Addition, not a change.** Section 23.1 requires the health endpoint to check Postgres reachability, but no Supabase project exists until Phase 2 and section 6.1 lists no direct Postgres driver. `pg` + `@types/pg` fill that gap. |

Also removed: `pino@9.7.0` was present in the scaffold but is absent from section
6.1. The logger is dependency-free instead, so it runs unchanged in the Node.js
runtime, the Edge runtime, and Vitest. Carrying an unused dependency that the
locked stack does not name is exactly the drift Build Rule 12 guards against.

### Resolved versions as installed

**Runtime**

| Package          | Version   |     | Package                    | Version   |
| ---------------- | --------- | --- | -------------------------- | --------- |
| `next`           | `15.5.22` |     | `@supabase/supabase-js`    | `2.49.8`  |
| `react`          | `19.2.8`  |     | `@supabase/ssr`            | `0.6.1`   |
| `react-dom`      | `19.2.8`  |     | `@tanstack/react-query`    | `5.76.2`  |
| `ai`             | `5.0.223` |     | `zustand`                  | `5.0.5`   |
| `@ai-sdk/openai` | `2.0.117` |     | `zod`                      | `3.25.76` |
| `openai`         | `4.98.0`  |     | `react-hook-form`          | `7.56.4`  |
| `js-tiktoken`    | `1.0.16`  |     | `@hookform/resolvers`      | `3.10.0`  |
| `ioredis`        | `5.6.1`   |     | `clsx`                     | `2.1.1`   |
| `pg`             | `8.22.0`  |     | `tailwind-merge`           | `3.3.0`   |
| `date-fns`       | `4.4.0`   |     | `class-variance-authority` | `0.7.1`   |
| `nanoid`         | `6.0.0`   |     | `lucide-react`             | `1.27.0`  |
| `next-themes`    | `0.4.6`   |     | `cmdk`                     | `1.1.1`   |
| `sonner`         | `2.0.6`   |     | `vaul`                     | `1.1.2`   |

**Development**

| Package                       | Version    |     | Package                     | Version  |
| ----------------------------- | ---------- | --- | --------------------------- | -------- |
| `typescript`                  | `5.9.3`    |     | `vitest`                    | `4.1.10` |
| `eslint`                      | `9.39.5`   |     | `@vitest/coverage-v8`       | `4.1.10` |
| `eslint-config-next`          | `15.5.22`  |     | `@vitejs/plugin-react`      | `6.0.4`  |
| `eslint-plugin-boundaries`    | `7.1.0`    |     | `@testing-library/react`    | `16.3.2` |
| `@eslint/eslintrc`            | `3.3.6`    |     | `@testing-library/jest-dom` | `7.0.0`  |
| `prettier`                    | `3.9.6`    |     | `jsdom`                     | `29.1.1` |
| `prettier-plugin-tailwindcss` | `0.8.1`    |     | `husky`                     | `9.1.7`  |
| `tailwindcss`                 | `4.3.3`    |     | `lint-staged`               | `16.4.0` |
| `@tailwindcss/postcss`        | `4.3.3`    |     | `tsx`                       | `4.23.1` |
| `@types/node`                 | `20.19.43` |     | `dotenv-cli`                | `11.0.0` |
| `@types/react`                | `19.2.17`  |     | `@types/pg`                 | `8.20.0` |
| `@types/react-dom`            | `19.2.3`   |     |                             |          |

All dependencies are pinned exactly. `package.json` contains no `^` or `~`, and
`package-lock.json` is committed.

---

## 7. Known deferred items

| Item                                   | Deferred to | Reason                                                                                                                                                                                       |
| -------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm audit` high/critical findings     | Phase 11    | "Zero high or critical" is a Phase 11 acceptance criterion, not Phase 1. Findings are transitive to the toolchain, not to shipped code.                                                      |
| Coverage threshold ≥ 80% on `lib/`     | Phase 10    | Section 15.8 mandates it; enforcing it in Phase 1 would fail a build that is correct for its phase. `vitest.config.ts` carries the threshold at 0 with a comment.                            |
| `eslint-plugin-boundaries` layer rules | Phase 3     | `components/` does not exist yet.                                                                                                                                                            |
| Content-Security-Policy                | Phase 11    | Requires the full inventory of script and style sources.                                                                                                                                     |
| Theme provider (`next-themes`)         | Phase 3     | Phase 1 honours the OS preference via `prefers-color-scheme`; the `:root:not(.light)` selector means the Phase 3 class-based provider will take precedence without revising the token block. |
