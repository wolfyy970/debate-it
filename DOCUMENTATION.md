# Documentation map

Use this file to pick the right doc without reading everything twice. **Operational setup and commands stay in [README.md](README.md)** — that is the entry point for new contributors and for running the app.

## Reading order by goal


| Goal                         | Start here                               | Then                                              |
| ---------------------------- | ---------------------------------------- | ------------------------------------------------- |
| Run or ship the app          | [README.md](README.md)                   | [USER_GUIDE.md](USER_GUIDE.md) if something fails |
| Understand the product       | [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md) | [PRODUCT.md](PRODUCT.md) for scope and decisions  |
| Change server or client code | [ARCHITECTURE.md](ARCHITECTURE.md)       | Source under `server/` and `src/`                 |
| Change UI look and feel      | [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)     | `src/tokens.css` and shared components            |


## Shared types

Cross-cutting domain types live in `**shared/domain.ts`**. **Debate scheduling** (segment list, agent-turn order, time estimate helpers, active strip index) lives in `**shared/debate-schedule.ts`** and is consumed by the API and SPA through `**src/lib/debateSchedule.ts**` — keep behavior and types aligned with `Debate.structure` in `server/lib/store.ts` / client types. Tests: `src/test/debate-schedule.test.ts`, `src/test/debate-phase.test.ts`, `src/test/debates-next-schedule-complete.test.ts`.

SSE event unions are defined on the server (`server/lib/sse-events.ts`) and mirrored for the SPA (`src/lib/sseEvents.ts`); when you change the live stream contract, update both sides and the tests that cover parsing (`src/test/sse-events.test.ts` and related reducer tests).

## What we avoid

- Duplicating install steps outside README.
- Maintaining two “system overview” narratives — product story is [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md); module-level detail is [ARCHITECTURE.md](ARCHITECTURE.md).

The `debate-it-handoff/` tree is historical reference material from an earlier engagement; it is not part of the maintained doc set above.