# Debater

> A Reasoning Instrument — Not a Chatbot

Debater runs multiple LLM agents under structured rules to produce insight: summaries, trade-offs, and defensible conclusions.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp example.env .env
# Edit .env and add your API keys (OpenRouter or Kimi)

# Start development (API + Vite in one terminal; Ctrl+C stops both)
npm run dev:all

# Or: build client once, then API + Vite (see start.sh)
./start.sh dev
```

**Access** (defaults; override `PORT` and `VITE_DEV_PORT` in `.env` — see `example.env`):
- App: http://localhost:52817
- API: http://localhost:38471
- Health: http://localhost:38471/health

## Documentation

How the markdown files relate: **[DOCUMENTATION.md](DOCUMENTATION.md)** (map only — setup stays here).

| Document | Purpose |
|----------|---------|
| **[SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)** | Narrative: debate flow, agents, evaluation |
| **[PRODUCT.md](PRODUCT.md)** | North Star + feature spec |
| **[USER_GUIDE.md](USER_GUIDE.md)** | Setup, workflow, troubleshooting |
| **[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)** | SPA design tokens, typography, components |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Technical: routes, modules, data flow |

## Testing

```bash
npm test          # Run tests once
npm run test:watch # Run tests in watch mode
```

## One-Liner

```bash
./start.sh dev    # Development
./start.sh prod   # Production
./start.sh pm2    # PM2 process management
```

## API Keys Required

Both an LLM provider key and a Tavily key are required to run a debate. The server returns **503** with `{ missing: { llm, tavily } }` until both are present.

- **OpenRouter** (`OPENROUTER_API_KEY`) **or** **Kimi** (`KIMI_API_KEY`) — LLM access
- **Tavily** (`TAVILY_API_KEY`) — web search for agent fact-checking (no Tavily, no debate)

**Both LLM keys set?** If `OPENROUTER_API_KEY` and `KIMI_API_KEY` are both present, traffic goes to **OpenRouter** (including models like `moonshotai/kimi-k2.6`). Use only `OPENROUTER_API_KEY` when you want OpenRouter-hosted Kimi; use only `KIMI_API_KEY` when you want the direct Moonshot API. Optional `DEBUG_DEBATE_SSE=1` logs streamed `delta` keys for debugging reasoning visibility (see `example.env`).

Optional **`VITE_API_URL`** points the SPA at a separate API host. **For local development, leave it empty** so requests stay on the Vite origin (`/api/...` is proxied to `PORT`). Only set it when the built UI and API are on different origins. **`PORT`** and **`VITE_DEV_PORT`** set the API and dev client ports (see `example.env`).

See [USER_GUIDE.md](USER_GUIDE.md) for detailed setup.
