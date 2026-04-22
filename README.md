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

| Document | Purpose |
|----------|---------|
| **[SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)** | Narrative: debate flow, agents, evaluation |
| **[PRODUCT.md](PRODUCT.md)** | North Star + feature spec |
| **[USER_GUIDE.md](USER_GUIDE.md)** | Setup, workflow, troubleshooting |
| **[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)** | SPA design tokens, typography, components |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Technical: routes, modules, data flow |

## One-Liner

```bash
./start.sh dev    # Development
./start.sh prod   # Production
./start.sh pm2    # PM2 process management
```

## API Keys Required

- **OpenRouter** (`OPENROUTER_API_KEY`) or **Kimi** (`KIMI_API_KEY`) — LLM access
- **Tavily** (`TAVILY_API_KEY`) — Optional, enables web search

See [USER_GUIDE.md](USER_GUIDE.md) for detailed setup.
