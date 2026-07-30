# OpsCopilot

**Your AI Support Engineer** — an enterprise AI-powered IT application
maintenance assistant.

Understands natural language, retrieves incidents, searches the enterprise
knowledge base with hybrid RAG, performs root cause analysis, assesses risk, and
grounds every factual claim in cited evidence.

> **Build status: Phase 1 of 12 complete** — repository initialization.
> The application runs on `localhost:3000` and reports dependency health.
> Authentication (Phase 2), UI shell (Phase 3), and everything downstream are
> not yet built.

---

## Setup

Four steps from a fresh clone to a running application.

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env.local

# 3. Add your OpenAI API key
#    Open .env.local and set:
#      OPENAI_API_KEY=sk-...

# 4. Run
npm run dev
```

Open <http://localhost:3000>.

**That is the whole setup.** No Docker, no database to install, no Redis, no
ServiceNow instance, no accounts to create.

On Windows, substitute `copy .env.example .env.local` for step 2.

### Prerequisites

| Requirement | Version | Notes                       |
| ----------- | ------- | --------------------------- |
| Node.js     | >= 20.9 | 22 LTS recommended          |
| npm         | >= 10   | Ships with Node             |
| OpenAI key  | —       | The judges provide this key |

### Verifying setup

```bash
npm run check:env    # confirms your key is valid and shows what is configured
```

**`OPENAI_API_KEY` is the only value you must supply.** Every other variable in
`.env.example` is commented out and has a working default — you can delete all
of them and the application still runs.

---

## Portability

This repository is designed to be cloned onto an unfamiliar machine and run
immediately. Everything needed to build and demo the application is committed:
source, configuration, documentation, scripts, tests, public assets, sample
datasets, mock API responses, the prompt library, and the evaluation framework.

Nothing is assumed to exist only on the original development machine.

Not committed, by policy: `.env.local`, API keys, service credentials,
`node_modules`, build output, coverage reports, logs, and OS files.

### External services

| Service    | Local development                                   | Arrives in |
| ---------- | --------------------------------------------------- | ---------- |
| OpenAI     | **Required** — the one key you supply               | Phase 5    |
| Supabase   | Not required. Demo auth until configured.           | Phase 2    |
| Postgres   | Not required. Optional connection string.           | Phase 4    |
| Redis      | Not required. Cache degrades to direct computation. | Phase 6    |
| ServiceNow | **Never required.** Mock layer with synthetic data. | Phase 8    |

`GET /api/v1/health` reports unconfigured infrastructure as `not_configured`
rather than `down` — a fresh clone having neither Postgres nor Redis is a
supported state, not a failure.

The ServiceNow mock implements the same interfaces a real integration will use,
so it can be swapped later without touching UI or AI logic.

---

## Scripts

| Script                  | What it does                                                     |
| ----------------------- | ---------------------------------------------------------------- |
| `npm run dev`           | Start the development server on port 3000                        |
| `npm run build`         | Production build                                                 |
| `npm run start`         | Serve a production build                                         |
| `npm run lint`          | ESLint — fails on any error **or warning**                       |
| `npm run lint:fix`      | ESLint with autofix                                              |
| `npm run typecheck`     | `tsc --noEmit` — must report zero errors                         |
| `npm run format`        | Prettier, write mode                                             |
| `npm run format:check`  | Prettier, check mode — used by CI                                |
| `npm run test`          | Vitest, single run                                               |
| `npm run test:watch`    | Vitest, watch mode                                               |
| `npm run test:coverage` | Vitest with V8 coverage                                          |
| `npm run check:env`     | Validate `.env.local` and show what is configured                |
| `npm run prepare`       | Install Husky git hooks (runs automatically after `npm install`) |

Scripts for later phases (`db:migrate`, `seed:demo`, `test:e2e`, `test:eval`, …)
are added by the phases that introduce the files they invoke.

---

## Project structure

```
src/
├── app/          Routes, layouts, Route Handlers — no business logic
├── components/   UI: ui/ (shadcn), layout/, features/, shared/, providers/
├── lib/          All business logic — ai/, rag/, db/, auth/, cache/, utils/
├── hooks/        Reusable client hooks
├── stores/       Zustand — ephemeral UI state only, never server data
├── types/        Shared TypeScript types
├── config/       Validated configuration
└── __tests__/    Unit and integration tests, mirroring lib/
```

Dependencies point inward only: `app/` → `components/` → `lib/` → `config/`.
Nothing in `lib/` may import from `app/` or `components/`. See
[`docs/decisions/0001-modular-monolith.md`](docs/decisions/0001-modular-monolith.md).

Folders carrying only a `.gitkeep` are part of the specified structure and are
populated by the phase that owns them.

---

## Configuration

Every variable is documented in [`.env.example`](.env.example) and validated by
`src/config/env.ts` at boot. A malformed value **crashes the process
immediately** — a half-configured AI application fails in subtle, expensive ways
at runtime.

`src/config/env.ts` is **server-only**. Client-safe values live in
`src/config/site.ts`, which reads `NEXT_PUBLIC_*` directly.

Never commit `.env.local`. Never prefix a secret with `NEXT_PUBLIC_`.

Run `npm run check:env` to see what is configured before starting the server.

---

## Quality gates

Every phase must pass all of these before the next begins (Build Rules 3–5):

```bash
npm run typecheck    # 0 errors
npm run lint         # 0 errors, 0 warnings
npm run format:check # no diffs
npm run test         # all pass
npm run build        # succeeds
```

Husky enforces a subset locally: `lint-staged` on pre-commit, `typecheck` and
`test` on pre-push.

---

## Future enhancements

Deliberately **out of scope** for the hackathon build, to keep the repository
portable and the setup to a single command:

- **Docker / docker-compose.** Containerised Postgres, Redis, and the mock
  ServiceNow service. Removed so that a fresh clone needs no container runtime.
  The application is stateless and containerises cleanly when wanted.
- **Managed Postgres with pgvector.** Vector storage currently targets an
  optional connection string rather than a required local instance.
- **Managed Redis.** Caching and rate limiting degrade to direct computation
  when absent.
- **A real ServiceNow instance.** The mock layer implements the same interfaces.
- **CI/CD pipelines.** GitHub Actions workflows arrive in Phase 10.

---

## Documentation

| Document                                                             | Contents                                       |
| -------------------------------------------------------------------- | ---------------------------------------------- |
| [`MASTER_BUILD_SPEC.md`](MASTER_BUILD_SPEC.md)                       | The authoritative specification, all 12 phases |
| [`docs/IMPLEMENTATION_OVERRIDE.md`](docs/IMPLEMENTATION_OVERRIDE.md) | Hackathon portability constraints              |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)                       | What is built, and where reality diverged      |
| [`docs/progress.md`](docs/progress.md)                               | Phase-by-phase progress log                    |
| [`docs/PHASE_1_COMPLETION.md`](docs/PHASE_1_COMPLETION.md)           | Phase 1 verification report                    |
| [`docs/decisions/`](docs/decisions/)                                 | Architecture Decision Records                  |
| [`docs/design-reference/`](docs/design-reference/)                   | Visual implementation targets for Phase 3      |
| [`docs/discovery/`](docs/discovery/)                                 | Original discovery documents (provenance)      |

---

## Contributing

Read [`MASTER_BUILD_SPEC.md`](MASTER_BUILD_SPEC.md) section 24 (Build Rules)
before writing code. In short: one phase at a time, no `TODO`s, no placeholder
implementations, no `any`, and the application must always run on localhost.
