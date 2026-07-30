# Design reference

Visual implementation targets for **Phase 3 — Enterprise UI**.

These are not inspiration. They are the target the implementation should match
as closely as is practical with shadcn/ui and the section 7.6 design tokens.

| File                                                                 | Target                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [`dashboard-ui-reference.png`](dashboard-ui-reference.png)           | Application shell: sidebar, top navigation, dashboard cards, charts |
| [`ai-assistant-chat-reference.png`](ai-assistant-chat-reference.png) | Floating AI assistant and chat surface                              |

## What to reproduce

- Overall layout and sidebar width
- Top navigation structure
- Dashboard card composition and the glass-card treatment
- Enterprise dark theme
- Analytics cards and charts
- Spacing rhythm and typography hierarchy
- Hover effects, transitions, shadows, corner radii
- Responsive behaviour

## Constraints

Build with shadcn/ui and Tailwind v4, using the design tokens defined in
`MASTER_BUILD_SPEC.md` section 7.6 — do not hard-code colours picked out of the
images. Where a reference colour and a token disagree, extend the token set
rather than bypassing it.

Do not simplify the interface, and do not redesign it.

Phase 3 owns this work. Earlier phases must not implement it.
