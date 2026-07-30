# ADR 0001 — Modular monolith over microservices

- **Status:** Accepted
- **Date:** 2026-07-30
- **Phase:** 1
- **Specification:** MASTER_BUILD_SPEC.md section 5.1, assumption A-25

## Context

OpsCopilot is a multi-agent AI system: a planner, a router, a task manager,
retrieval agents, analysis agents, a validator, a risk analyser, and a
synthesiser — fifteen agents in total (section 10.1).

The source discovery questionnaire (`03_Tech_Stack_Discovery`, section 1) asked
whether the solution should follow a modular monolith or microservices
architecture. It was never answered, so this decision was made by the
specification and recorded as assumption A-25.

## Decision

A **modular monolith** inside a single Next.js 15 App Router application,
deployed as one unit, with internal boundaries enforced by folder structure,
ESLint import rules, and a strict inward-only dependency direction.

## Rationale

**Agent communication is extremely chatty.** A single user query may involve a
planner call, a router call, up to three retrieval passes, several tool
invocations, a validation pass, and a synthesis pass. Splitting those across
network boundaries would add latency to precisely the path that is most
latency-sensitive — the specification budgets 1.5 s to first token for the main
chat and 2.5 s for a complete widget answer (section 4.1).

**Distributed tracing would be a second system to build.** The observability
requirement (section 4.6) is a correlation ID spanning request, agent, tool, and
model call. In-process that is a parameter. Across services it is a tracing
backend, a context-propagation library, and a sampling strategy — none of which
deliver user-facing value in a hackathon timeframe.

**The boundaries are preserved without paying for them.** Section 5.2's
dependency rule and the module ownership table in section 6.3 define the same
seams a service split would. `eslint-plugin-boundaries` enforces them at compile
time. If a module later needs independent scaling, it can be extracted along a
seam that is already clean.

**The state is already external.** All application state lives in Postgres or
Redis (section 4.2), so the Next.js process is stateless and horizontally
scalable as it stands. The usual scaling argument for microservices does not
apply here.

## Consequences

**Positive**

- Agent-to-agent calls are function calls: no serialisation, no network latency,
  no partial-failure modes between agents.
- One deployable, one log stream, one health endpoint.
- Local development runs the entire system with `npm run dev` plus two Docker
  containers.
- Refactoring across module boundaries is a type-checked operation.

**Negative**

- The whole application scales as one unit. A retrieval-heavy workload scales
  the chat UI with it.
- A module cannot be written in a different language or on a different runtime.
- Boundary enforcement depends on lint rules, which a determined author can
  bypass. Code review carries part of the load.

**Neutral**

- Extraction remains available later. The seams in section 6.3 are the
  extraction points, and the forbidden-edge list (RAG must not import agents;
  tools must not import the orchestrator; guardrails must not import agents)
  keeps them acyclic.

## Alternatives considered

**Microservices per agent group.** Rejected: adds network latency to the
critical path, requires distributed tracing before the system can be debugged at
all, and multiplies deployment surface for a single-tenant MVP serving 50
concurrent sessions (assumption A-02).

**Serverless functions per agent.** Rejected: cold starts are unacceptable
against a 1.5 s first-token budget, and the orchestrator holds state across
steps within one request.

**Separate backend service (e.g. FastAPI) behind the Next.js frontend.**
Rejected: doubles the language and toolchain surface, and forfeits React Server
Components fetching directly from the data layer — which is the default
rendering strategy in section 7.1.
