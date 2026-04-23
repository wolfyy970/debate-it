# Architecture

## System Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React SPA     │────▶│   Express API    │────▶│   LLM APIs      │
│   (Vite dev)    │◄────│   (Port 38471*)  │◄────│   (OpenRouter)  │
│                 │ SSE │                  │     │   (Kimi)        │
│  - Landing      │     │  - Routes        │     └─────────────────┘
│  - Setup        │     │  - Validation    │              │
│  - LiveDebate   │     │  - Queue         │              ▼
│  - Synthesis    │     │  - Store         │     ┌─────────────────┐
└─────────────────┘     └──────────────────┘     │   Tavily API    │
                                                  │   (Search)      │
                                                  └─────────────────┘
```

\*Default API port is **38471** (`PORT` / `DEFAULT_API_PORT`); Vite dev/preview defaults to **52817** (`VITE_DEV_PORT`). Override in `.env`.

## Frontend

### Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `LandingPage` | Hero + topic input |
| `/setup` | `SetupPage` | Agent configuration |
| `/live/:id` | `LiveDebatePage` | Real-time debate viewing |
| `/synthesis/:id` | `SynthesisPage` | Final analysis |
| `/error` | `ErrorPage` | Error states |

### State Management

No global state library. Each page manages its own state:

- **Landing** — `topic` input, suggestion navigation
- **Setup** — `topic`, `selectedMode`, `agents[]`, `toggles`, `structure` (rounds, cross-ex, synthesis type; see `shared/debate-schedule.ts`)
- **LiveDebate** — `useDebateSse` plus `debateSseReducer` fold SSE into debate snapshot, streaming text, reasoning, active searches, and control-plane state (cancel/retry, phase strip). `EventSource` lifecycle lives in the hook so reconnect and server job state stay aligned.
- **Synthesis** — `debate`, `synthesis`

### Components

| Component | File | Props |
|-----------|------|-------|
| `Masthead` | `Masthead.tsx` | `title`, `edition`, `right?` |
| `Button` | `Button.tsx` | `variant`, `size`, `full?`, `onClick` |
| `Card` | `Card.tsx` | `children`, `style?` |
| `Pill` | `Pill.tsx` | `variant?`, `active?`, `onClick?` |
| `Toggle` | `Toggle.tsx` | `on`, `label`, `hint`, `onChange` |
| `Segmented` | `Segmented.tsx` | `options`, `value`, `onChange` |
| `ModelSelect` | `ModelSelect.tsx` | `value`, `provider`, `open`, `onToggle`, `onSelect` |
| `Byline` | `Byline.tsx` | `role`, `style` |
| `Eyebrow` | `Eyebrow.tsx` | `accent?`, `children` |
| `PhaseGlyph` | `PhaseGlyph.tsx` | `phase` |
| `Caret` | `Caret.tsx` | — |

### Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useBreakpoint` | `hooks/useBreakpoint.ts` | Returns `bp`, `isMobile` / `isTablet` / `isDesktop`, and **`stackShell`** (stack main+rail below 1025px); thresholds in `theme/breakpoints.ts` align with `tokens.css` |
| `useDebateSse` | `hooks/useDebateSse.ts` | SSE subscription to `/api/debates/:id/stream`; dispatches into `state/debateSseReducer.ts` |

## Backend

### Routes

```
GET    /health              → Health check + API key status (`configured.{openrouter,kimi,tavily}`, `hasAllRequired`, `persistence.loadError`)
POST   /api/debates         → Create debate (503 with `missing={llm,tavily}` if required keys are unset)
GET    /api/debates/:id     → Get debate
POST   /api/debates/:id/turns    → Add moderator question
POST   /api/debates/:id/next     → Queue next turn (**409** if a generation is already active, or **`reason: schedule_complete`** when agent steps + `turnCap` are exhausted)
GET    /api/debates/:id/stream   → SSE stream
POST   /api/debates/:id/cancel   → Cancel generation
POST   /api/debates/:id/retry    → Retry failed turn (409 if a generation is already active)
POST   /api/debates/:id/complete → Complete + synthesize
```

### Modules

#### `lib/store.ts`

JSON file persistence layer:
- `DebateStore` class with Map-based caching
- Auto-save on every write using a temp file + rename
- Load from disk on startup; `getLastLoadError()` records the last bootstrap failure (surfaced on `GET /health` as `persistence.loadError`)
- Path: `data/debates.json`

#### `lib/debate-agent.ts`

ReAct agent loop:
- `DebateAgent` class
- Async generator yields events: `text_delta`, `reasoning`, `tool_call_start`, `tool_call_delta`, `tool_call_end`, `search_results`, `url_read`, `done`, `error`
- Max **8** iterations (`MAX_AGENT_ITERATIONS`) to cap tool-heavy loops
- **Forced prose pass**: if a turn would end with **no body text** (only tools/sources), the agent runs one more streaming call **with tools disabled** and a user nudge; if text is still empty, it yields **`error`** (`Model produced no argument`) instead of committing an empty turn
- Parses search results into structured `Source` records for the store

#### `lib/debate-phase.ts`

Phase, round, and **next speaker** are driven by **`shared/debate-schedule.ts`**: `buildSchedule(structure)` defines segments (Opening, optional Cross-Ex, numbered Rebuttals, Final, terminal Synthesis); `flattenAgentSteps` is the ordered Advocate/Skeptic queue for `POST /next`. **`countCommittedAgentTurns`** ignores `meta` topic rows and moderator clarifications. `computePhaseAfterTurnCompletion` / `syncDebatePhaseFromTurns` update persisted debate state after each committed agent turn (or after retry pop / moderator `POST …/turns` resync). **`maxCommittedAgentTurns`** applies `structure.turnCap` as a hard ceiling.

#### `lib/synthesis.ts`

Judge synthesis: message building, JSON extraction from model output, and a small fallback path when parsing fails.

#### `lib/openrouter.ts`

LLM streaming:
- `streamWithTools()` — core streaming function; composes the job `AbortSignal` with a **hard max wall-clock** per HTTP stream (`LLM_STREAM_MAX_MS` in `constants.ts`, default 5 minutes) on the streaming `fetch` only
- `streamOpenRouterWithTools()` — OpenRouter provider
- `streamKimiWithTools()` — Kimi direct provider
- `generateResponse()` — blocking mode for synthesis
- `buildSystemPrompt()` — prompt construction
- **Idle stall detection** — not on the `fetch` signal; enforced in `chat-completion-sse.ts` (see below)

#### `lib/chat-completion-sse.ts`

Low-level SSE framing parser for provider streams (shared test coverage with the client wire format). Enforces an **idle timeout** (`LLM_STREAM_IDLE_MS`, default **90s**): if no bytes arrive from the provider for that long, the body reader is cancelled and parsing throws a clear “stalled” error — so long gaps between tokens (e.g. reasoning models) do not trip a short **total** wall-clock on the whole stream.

#### `lib/generation-queue.ts`

Generation orchestration (singleton):
- Job lifecycle: queued → generating → completed | error | cancelled, with `AbortController` wired through `DebateAgent` / fetches
- Registers per-debate SSE listeners; emits typed `ServerSseEvent` payloads (chunks, reasoning, search UI for **`search_web`**, **`url_read`** for full-page fetch telemetry, errors, `turn`, `phase-change`, `cancelled`)
- **Single writer for completed turns**: after a successful agent run, builds the `Turn`, runs `computePhaseAfterTurnCompletion`, persists via `DebateStore`, then notifies subscribers
- `getActiveJob(debateId)` enables **409 Conflict** on `/next` and `/retry` when work is already in flight

#### `lib/sse-events.ts` / `lib/sse-writer.ts` / `lib/http-errors.ts`

- **`sse-events.ts`** — server-side typed stream events (keep aligned with `src/lib/sseEvents.ts` and `src/state/debateSseReducer.ts`; tests cover the wire format)
- **`sse-writer.ts`** — `writeSseData` helper for Express SSE responses
- **`http-errors.ts`** — `sendApiError` for consistent JSON error responses

#### `lib/search.ts`

Tavily API wrapper:
- `searchWeb()` — returns `SearchResult[]`; throws `SearchUnavailableError` when `TAVILY_API_KEY` is unset; **propagates** HTTP/network/timeout failures (no silent `[]` on error). Optional `AbortSignal` is combined with `TAVILY_FETCH_TIMEOUT_MS` so job cancel aborts in-flight Tavily requests.
- `hasTavilyKey()` — capability check used by the `checkApiKeys()` / route gate
- `formatSearchResults()` — string formatting

#### `lib/tools/`

Tool surface for the agent:
- `definitions.ts` / `types.ts` — schema the model calls (`search_web`, `read_url`)
- `executors/` — Tavily search and URL read implementations (honor optional cancel `AbortSignal` from `executeTool`)
- `index.ts` — `executeTool(toolCall, { signal })` dispatcher

#### `lib/debate-agent.ts` (search vs citations)

- **SSE / UI** — each `search_results` event carries the **raw** hits returned for that tool call (so overlapping queries still show URLs in the live panel).
- **Turn citations** — URLs are still **deduplicated** into `this.sources` for the persisted turn and `[n]` citation list.

#### `lib/tokenizer.ts`

Token counting:
- `countTokens()` — per-model token counting via js-tiktoken (with safe fallback)

#### `lib/constants.ts`

Shared magic numbers: SSE heartbeat, `LLM_STREAM_IDLE_MS` / `LLM_STREAM_MAX_MS`, Tavily fetch timeout, `MAX_AGENT_ITERATIONS`, etc. — imported by routes, openrouter, chat-completion-sse, and tests.

#### `shared/domain.ts` / `shared/debate-schedule.ts`

Cross-tier domain types (`domain.ts`) and **debate schedule** math (`debate-schedule.ts`; re-exported to the SPA as `src/lib/debateSchedule.ts`).

### Data Flow

```
User clicks "Next" → POST /api/debates/:id/next (409 if queue already active or `schedule_complete`)
    ↓
GenerationQueue.enqueue()
    ↓
DebateAgent.run(signal) → AsyncGenerator
    ↓
streamWithTools(signal) → provider SSE → parsed chunks / reasoning / tools / sources
    ↓
GenerationQueue forwards streaming SSE → GET /stream listeners → browser EventSource
    ↓
useDebateSse + debateSseReducer → Live UI state
    ↓
On successful completion inside queue: persist Turn + phase/round, emit `turn` + `phase-change`
```

### Middleware

- **Validation** (`middleware/validation.ts`): Request body schema validation, ID format validation
- **Error Handler** (`index.ts`): Global error handler with structured responses
- **Request Logger** (`index.ts`): Timestamp, method, path, status, duration

## Key Decisions

### Why no CSS-in-JS?

Design tokens in CSS custom properties enable:
- Theme switching (light/dark) without JavaScript
- Zero runtime overhead
- Native browser performance
- Simple responsive tokens via CSS

### Why SSE over WebSocket?

- Unidirectional data flow (server → client)
- Automatic reconnection with EventSource
- Simpler than WebSocket for this use case
- Works over HTTP/1.1

### Why JSON file over database?

- MVP simplicity
- No database setup required
- Human-readable
- Easy backup/restore
- Can migrate to DB later without architecture changes

### Why inline styles over CSS modules?

- Design system uses CSS custom properties (no need for module scoping)
- Dynamic values (responsive breakpoints, role colors) easier in JS
- No build-time CSS processing needed
- Trade-off: slightly larger JS bundles

## File Organization

```
debate-it/
├── server/
│   ├── index.ts              # Entry: Express setup, graceful shutdown, /health
│   ├── routes/
│   │   └── debates.ts        # Debate REST + SSE route handlers
│   ├── middleware/
│   │   └── validation.ts     # Input validation
│   └── lib/
│       ├── store.ts          # JSON persistence + IDs
│       ├── debate-agent.ts   # ReAct agent loop
│       ├── debate-phase.ts   # Phase / next-agent rules
│       ├── synthesis.ts      # Judge synthesis helpers
│       ├── openrouter.ts     # LLM streaming + blocking generate
│       ├── chat-completion-sse.ts
│       ├── generation-queue.ts
│       ├── sse-events.ts
│       ├── sse-writer.ts
│       ├── http-errors.ts
│       ├── search.ts
│       ├── tools/            # Tool defs + executors
│       ├── tokenizer.ts
│       └── constants.ts
├── shared/
│   └── domain.ts             # Cross-tier domain types
├── src/
│   ├── pages/                # Landing, Setup, LiveDebate, Synthesis, Error
│   ├── components/           # UI primitives + debate/PhaseStrip, TurnRow, …
│   ├── hooks/                # useBreakpoint, useDebateSse
│   ├── state/
│   │   └── debateSseReducer.ts
│   ├── lib/                  # constants, sseEvents, …
│   ├── types.ts
│   ├── tokens.css
│   └── main.tsx
├── data/debates.json         # Persistent storage (gitignored path in dev)
├── start.sh
└── ecosystem.config.cjs
```
