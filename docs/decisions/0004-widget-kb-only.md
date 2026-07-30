# ADR 0004 — The floating assistant is KB-only, by construction

- **Status:** Accepted
- **Date:** 2026-07-30
- **Phase:** 2 (documented ahead of implementation in Phase 6)
- **Specification:** MASTER_BUILD_SPEC.md §1.3, §3.3 (FR-WIDGET), §10.3

## Context

The product exposes AI through two surfaces with strictly different
capabilities: the main chat (`/chat`, full tool access, every agent) and the
floating assistant (every authenticated page, knowledge-base retrieval only).
The specification treats this separation as a core architectural commitment,
not a UI convenience — the widget must **never** call ServiceNow, invoke the
planner/router, or perform multi-step tool chains, even transitively.

This decision is recorded now, in Phase 2, because the enforcement boundary it
requires — separate route, separate agent registry, a disjoint tool allow-list
— has to be designed in before Phase 6 builds the widget's route handler, not
retrofitted after.

## Decision

The chat surface and the widget surface will be implemented as two physically
separate code paths from the route handler down:

- Separate API routes: `/api/v1/chat` (chat) vs. `/api/v1/assistant` (widget).
- Separate agent registries with disjoint tool allow-lists — the widget's
  registry contains no ServiceNow tool definition at all, so there is nothing
  to accidentally invoke.
- A server-side assertion in the widget's execution context that throws if a
  ServiceNow tool is ever reached, as a second, independent guard against a
  future refactor accidentally sharing a registry.

## Rationale

**Latency.** The widget budgets ≤1.0s p95 to first token and ≤2.5s p95 to a
complete answer (NFR-PERF-3/4) — an order of magnitude tighter than the main
chat. A shared code path with runtime capability checks would still pay for
the planner/router's latency budget even when short-circuited.

**Cost.** The widget is invoked far more frequently than the chat (target ≥10
invocations/user/week vs. deliberate, session-based chat usage). Routing every
widget call through the full agent registry would multiply the cheap-model
cost by however many steps the planner considers before deciding not to use
them.

**Blast radius.** A compromised or buggy widget route must be structurally
incapable of leaking ticket data into a context the user may not be
authorised to see, even if every other check fails. Two disjoint registries
make "the widget called ServiceNow" impossible to reach, not just unlikely.

## Consequences

- Phase 6 (widget) and Phase 7 (chat) cannot share a single "universal agent
  runner" — they share primitives (LLM client, RAG retriever, guardrails) but
  not the orchestration loop.
- Any future capability added to the widget (e.g. FR-WIDGET-10, "continue in
  full chat") must hand off to the chat surface rather than absorbing chat
  capabilities into the widget.
