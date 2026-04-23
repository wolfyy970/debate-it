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

# Start development
./start.sh dev
```

**Access:**
- App: http://localhost:5173
- API: http://localhost:3001
- Health: http://localhost:3001/health

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

Optional **`VITE_API_URL`** in `.env` points the SPA at a separate API host (all `fetch` and `EventSource` use it). Leave unset for same-origin or the Vite dev proxy.

See [USER_GUIDE.md](USER_GUIDE.md) for detailed setup.
