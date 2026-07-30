# Implementation Override — Hackathon Portability

> **Status:** Active. Supersedes `MASTER_BUILD_SPEC.md` where the two conflict.
> **Scope:** Hackathon development only.
> **Does not redesign the specification** — it constrains how it is implemented.

This override was issued during Phase 1. Where it contradicts the specification,
this document wins; everything it does not mention follows the specification
unchanged.

## Effect on the specification

| Spec section | Overridden by |
|---|---|
| §23.1 — `Dockerfile`, `docker-compose.yml` in Files to Create | Docker removed entirely; recorded as a Future Enhancement |
| §23.1 — two Docker-dependent acceptance criteria | Superseded; replaced by a no-container localhost run |
| §14.1, §14.2 — seven required environment variables | `OPENAI_API_KEY` only; everything else defaulted or optional |
| §26.2 — Docker Compose appendix | Not implemented |
| §23.8 — live ServiceNow integration | Mock layer only, same interfaces |

Deviations are logged in §25 (Open Decisions Log) of the specification as
entries 008 and 009.

---

IMPORTANT PROJECT UPDATE

The implementation strategy has changed.

This project is for a hackathon.

The objective is to maximize portability.

## Deployment Strategy

Do NOT implement Docker during development.

Skip

- Dockerfile
- docker-compose.yml
- docker health checks
- container-specific scripts

Mark Docker as

"Future Enhancement"

in the documentation.

Do not let Docker block implementation.

## Localhost Only

The application must run completely using

npm install
npm run dev

No Docker required.

No container runtime required.

## Github Portability

The complete repository will be pushed to GitHub.

Another machine (hackathon laptop) will clone/download it.

Therefore

Everything required to build the project MUST exist inside Git.

Commit

source

configuration

documentation

scripts

tests

public assets

design assets

generated documentation

Do NOT rely on anything existing only on my local machine.

## Do Not Commit

Never commit

.env.local

.env

API keys

Service credentials

Supabase secrets

OpenAI keys

Redis passwords

Node modules

Build outputs

Coverage reports

Logs

Temporary files

OS files

## Commit

Commit

README

.env.example

MASTER_BUILD_SPEC.md

All documentation

All source code

All configs

Tailwind config

ESLint

Prettier

VSCode settings

Husky

Vitest

Playwright

Public assets

Images

Icons

Fonts (if license permits)

Sample datasets

Sample JSON

Knowledge Base documents

Synthetic ServiceNow responses

Mock API responses

Prompt library

Agent definitions

RAG pipeline

Evaluation framework

Every implementation file

## Demo Mode

The judges will provide an OpenAI API Key.

Design the application so that

the ONLY required configuration after cloning is

OPENAI_API_KEY

Everything else should work immediately.

## Local Demo

The project should run after

git clone

npm install

copy .env.example to .env.local

paste OpenAI API key

npm run dev

Nothing else should be required.

## Service Now

Do NOT require a real ServiceNow instance.

Instead implement

Mock ServiceNow Layer

Synthetic Incident Dataset

Synthetic Ticket Dataset

Knowledge Base Dataset

Demo Users

Demo Roles

Demo Incident History

Demo Analytics

Mock APIs

Use the same interfaces that a real ServiceNow integration will use.

The mock implementation should be replaceable later without changing UI or AI logic.

## Project Rule

Everything required for the hackathon demo must exist inside the repository.

A fresh clone should be enough to run the application locally.

## Git Workflow

Before every phase

git status

git log --oneline -5

Inspect current repository

Continue from the latest completed phase.

After every phase

Run

npm install

npm run lint

npm run typecheck

npm test

npm run build

npm run dev

Fix every issue.

Commit

Update docs/progress.md

Generate PHASE_X_COMPLETION.md

Then stop.

Do not redesign MASTER_BUILD_SPEC.md.

Treat this as an implementation override for hackathon development only.
