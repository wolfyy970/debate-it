# User Guide

## Setup

### Prerequisites

- Node.js (v18+) with npm
- API key from OpenRouter or Kimi/Moonshot

### Installation

```bash
# 1. Clone and install
git clone <repo-url>
cd debate-it
npm install

# 2. Configure environment
cp example.env .env
# Edit .env and add your API keys
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | Yes* | — | OpenRouter API key |
| `KIMI_API_KEY` | Yes* | — | Kimi/Moonshot direct API key |
| `TAVILY_API_KEY` | Yes | — | Tavily search API. Required — agents must be able to search the web. |
| `PORT` | No | 3001 | Server port |
| `VITE_API_URL` | No | http://localhost:3001 | Frontend API URL |

*At least one LLM API key required, plus `TAVILY_API_KEY`. If either is missing the app routes to an error screen instead of starting a debate.

### Starting the App

```bash
# Development (frontend + backend)
./start.sh dev

# Production
./start.sh prod

# PM2 (recommended for production)
npm install -g pm2
./start.sh pm2
```

Or manually:
```bash
# Terminal 1
npm run server

# Terminal 2
npm run dev
```

## Workflow

### 1. Landing Page

- Type a debate question or select a suggestion
- Click **Begin** or press Enter

### 2. Setup Page

- Review the question
- Select debate mode (Balanced, Adversarial, Decision, Educational, Devil's Advocate)
- Configure agents:
  - **Advocate** — Argues in favor
  - **Skeptic** — Argues against
  - **Judge** — Synthesizes at the end
- For each agent: select model, role, style
- Toggle options (fact-checking, steelmanning, etc.)
- Click **Begin Debate**

### 3. Live Debate

- Watch agents debate in real-time
- See thinking process, web searches, and text generation
- **Pause** — Stop auto-advance
- **Next** — Manually trigger next turn (when paused)
- **Stop** — Cancel current generation
- **Ask Clarifying Question** — Only available during Cross-Ex
- **End & Synthesize** — End debate early and generate synthesis

### 4. Synthesis

- Review the structured analysis
- Key arguments from both sides
- Points of agreement and disagreement
- Unresolved questions
- Judge's verdict (if Decision mode)
- **New Debate** — Start over
- **Review Debate** — Return to live view

## Troubleshooting

### Server won't start

```bash
# Check if port is in use
lsof -i :3001

# Kill existing processes
pkill -f "tsx server"
pkill -f "vite"
```

### API key not working

```bash
# Check .env is loaded
cat .env

# Test health endpoint
curl http://localhost:3001/health
```

The JSON response includes `persistence.loadError`. If that field is non-null, the server started but the debates file failed to load (see **Data not persisting** below); new debates may still be created, but existing data could be missing until the file is repaired.

### Debate won't start / redirects to an error page

Hit `/health` — if `configured.tavily` or `hasAnyKey` is false, the server refuses to create or advance debates. Set the missing keys in `.env` and restart.

### Agents generate empty responses

- Check OpenRouter/Kimi API key is valid
- Check server logs: `cat /tmp/server.log`

### Data not persisting

```bash
# Check data directory exists
ls -la data/

# Check permissions
chmod 755 data
```

## Tips

- **Best questions** are polarizing but evidence-based: "Should X be mandatory?", "Is Y a net social good?"
- **Data-driven style** works best for factual topics
- **Philosophical style** works best for values-based topics
- Enable **Force steelmanning** for more rigorous debates
- Use **Decision mode** when you need a clear recommendation

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v0.1 | Apr 2026 | MVP — Structured debate, multi-agent, synthesis, responsive design |
