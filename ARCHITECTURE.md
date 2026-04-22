# Architecture

## System Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React SPA     │────▶│   Express API    │────▶│   LLM APIs      │
│   (Vite dev)    │◄────│   (Port 3001)    │◄────│   (OpenRouter)  │
│                 │ SSE │                  │     │   (Kimi)        │
│  - Landing      │     │  - Routes        │     └─────────────────┘
│  - Setup        │     │  - Validation    │              │
│  - LiveDebate   │     │  - Queue         │              ▼
│  - Synthesis    │     │  - Store         │     ┌─────────────────┐
└─────────────────┘     └──────────────────┘     │   Tavily API    │
                                                  │   (Search)      │
                                                  └─────────────────┘
```

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
- **Setup** — `topic`, `selectedMode`, `agents[]`, `toggles`
- **LiveDebate** — `debate`, `streamingText`, `reasoningText`, `isStreaming`, `activeSearches[]`
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
| `useBreakpoint` | `hooks/useBreakpoint.ts` | Returns 'mobile' | 'tablet' | 'desktop' |

## Backend

### Routes

```
GET    /health              → Health check + API key status
POST   /api/debates         → Create debate
GET    /api/debates/:id     → Get debate
POST   /api/debates/:id/turns    → Add moderator question
POST   /api/debates/:id/next     → Queue next turn
GET    /api/debates/:id/stream   → SSE stream
POST   /api/debates/:id/cancel   → Cancel generation
POST   /api/debates/:id/retry    → Retry failed turn
POST   /api/debates/:id/complete → Complete + synthesize
```

### Modules

#### `lib/store.ts`

JSON file persistence layer:
- `DebateStore` class with Map-based caching
- Auto-save on every write
- Load from disk on startup
- Path: `data/debates.json`

#### `lib/debate-agent.ts`

ReAct agent loop:
- `DebateAgent` class
- Async generator yields events: `text_delta`, `reasoning`, `tool_call_start`, `tool_call_delta`, `tool_call_end`, `search_results`, `done`, `error`
- Max 5 iterations to prevent loops
- Parses search results into structured sources

#### `lib/openrouter.ts`

LLM streaming:
- `streamWithTools()` — core streaming function
- `streamOpenRouterWithTools()` — OpenRouter provider
- `streamKimiWithTools()` — Kimi direct provider
- `generateResponse()` — blocking mode for synthesis
- `buildSystemPrompt()` — prompt construction

#### `lib/generation-queue.ts`

SSE event management:
- `GenerationQueue` singleton
- Job tracking (queued → generating → completed | error | cancelled)
- SSE listener registration per debate
- Event forwarding: chunks, reasoning, searches, errors, completion

#### `lib/search.ts`

Tavily API wrapper:
- `searchWeb()` — returns `SearchResult[]`
- Fallback message when API key missing
- `formatSearchResults()` — string formatting

#### `lib/tools.ts`

Tool definitions:
- `search_web` — parameters: `query`, `reason`
- `read_url` — parameters: `url`, `reason`
- `executeTool()` — dispatches to implementation

#### `lib/tokenizer.ts`

Token counting:
- `countTokens()` — per-model token counting via js-tiktoken
- `countMessagesTokens()` — batch counting with overhead

### Data Flow

```
User clicks "Next" → POST /api/debates/:id/next
    ↓
GenerationQueue.enqueue()
    ↓
DebateAgent.run() → AsyncGenerator
    ↓
streamWithTools() → SSE from OpenRouter/Kimi
    ↓
Event parsing → text_delta / reasoning / tool_call_* / done
    ↓
GenerationQueue emits SSE events → Frontend
    ↓
Frontend updates: streamingText, reasoningText, activeSearches
    ↓
On 'done': Save turn to store, update phase, emit 'turn' event
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
│   ├── index.ts              # Entry: Express setup, graceful shutdown
│   ├── routes/
│   │   └── debates.ts        # All debate endpoints
│   ├── middleware/
│   │   └── validation.ts     # Input validation
│   └── lib/
│       ├── store.ts          # JSON persistence
│       ├── debate-agent.ts   # ReAct agent loop
│       ├── openrouter.ts     # LLM streaming
│       ├── generation-queue.ts # SSE management
│       ├── search.ts         # Tavily API
│       ├── tools.ts          # Tool definitions
│       └── tokenizer.ts      # Token counting
├── src/
│   ├── pages/
│   │   ├── Landing.tsx       # Hero + topic input
│   │   ├── Setup.tsx         # Agent configuration
│   │   ├── LiveDebate.tsx    # Real-time viewing
│   │   ├── Synthesis.tsx     # Final analysis
│   │   └── ErrorPage.tsx     # Error states
│   ├── components/
│   │   ├── Masthead.tsx      # Header
│   │   ├── Button.tsx        # Buttons
│   │   ├── Card.tsx          # Cards
│   │   ├── Pill.tsx          # Badges
│   │   ├── Toggle.tsx        # Switches
│   │   ├── Segmented.tsx     # Selectors
│   │   ├── ModelSelect.tsx   # Model dropdown
│   │   ├── Byline.tsx        # Attribution
│   │   ├── Eyebrow.tsx       # Labels
│   │   ├── PhaseGlyph.tsx    # Phase icons
│   │   └── Caret.tsx         # Cursor
│   ├── hooks/
│   │   └── useBreakpoint.ts  # Responsive
│   ├── types.ts              # All interfaces
│   ├── tokens.css            # Design system
│   └── main.tsx              # React entry
├── data/
│   └── debates.json          # Persistent storage
├── logs/                     # Application logs
├── start.sh                  # Startup script
├── ecosystem.config.cjs      # PM2 config
└── .env                      # Environment (gitignored)
```
