# Product Specification

## North Star

**Turn complex questions into well-structured arguments, clarified trade-offs, and actionable conclusions — through structured multi-agent debate.**

## Current State

### Implemented Features

- **Structured Debate Flow** — Opening → Cross-Ex → Rebuttal → Final → Synthesis
- **Multi-Agent System** — Advocate, Skeptic, Judge roles with configurable styles
- **Real-Time Streaming** — SSE-based live viewing of agent reasoning, text generation, and web searches
- **Web Search Integration** — Agents search via Tavily API and read URLs for evidence
- **Cross-Examination** — Moderator can ask clarifying questions during Cross-Ex phase
- **Synthesis Generation** — Judge produces structured summary with verdict
- **Multi-Model Support** — 30+ models from 8 providers (Anthropic, OpenAI, Google, xAI, DeepSeek, Mistral, Qwen, Moonshot)
- **Dark Mode** — Full light/dark theme system
- **Persistent Storage** — Debates saved to JSON file with auto-save
- **Production Hardening** — PM2 support, graceful shutdown, health checks

### Feature Toggle Inventory

| Toggle | Implemented | Backend Support | Description |
|--------|-------------|-----------------|-------------|
| Fact-checking | ✅ Frontend | ❌ Backend ignores | Flag unsupported claims |
| Force steelmanning | ✅ Frontend | ❌ Backend ignores | Require strongest claim version |
| Require final verdict | ✅ Frontend | ❌ Backend ignores | Judge must issue recommendation |
| Argument scoring | ✅ Frontend | ❌ Backend ignores | Score turns on rigor/evidence/novelty |

### Known Gaps

1. **Toggles sent to backend but not applied** — Backend stores toggle values but generation logic doesn't use them
2. **No actual fact-checking** — Fact-checker agent exists in types but not in the debate loop
3. **No contradiction detection** — Pi-mono style contradiction analysis not implemented
4. **Scoring is decorative** — StrengthBar component removed, no actual scoring logic

## Roadmap

### Short Term

1. Wire up toggles to affect agent prompts (fact-checking, steelmanning)
2. Implement fact-checker agent that runs after each turn
3. Add contradiction/convergence detection to synthesis
4. Make argument scoring real (not decorative)

### Medium Term

1. Debate history / library page
2. Fork debates with modified parameters
3. Export synthesis to markdown/PDF
4. Custom agent roles beyond Advocate/Skeptic/Judge

### Long Term

1. Multi-round tournaments
2. Human-in-the-loop judge voting
3. Public debate sharing
4. API for third-party integrations

## Model Roster

| Provider | Family | Models |
|----------|--------|--------|
| Anthropic | Claude | claude-opus-4, claude-sonnet-4, claude-opus-4.5, claude-sonnet-4.5 |
| OpenAI | GPT | gpt-5, gpt-5-pro, gpt-5-mini, o3-pro, gpt-5.1–5.4 |
| Google | Gemini | gemini-2.5-pro/flash, gemini-3.1-pro/flash |
| xAI | Grok | grok-3, grok-4, grok-4-fast |
| DeepSeek | DeepSeek | deepseek-r1-0528, deepseek-v3.2, deepseek-chat-v3.1 |
| Mistral | Mistral | mistral-medium-3, mistral-small-3.2, mistral-large-2512 |
| Qwen | Qwen | qwen3-235b, qwen3-coder, qwen3.6-plus |
| Moonshot | Kimi | kimi-k2, kimi-k2.5, kimi-k2.6 |

## Debate Structure Defaults

- **Rounds:** 4
- **Turn cap:** ~500 tokens
- **Cross-Ex after:** Round 2
- **Synthesis type:** Judge + system

## Success Metrics

- Time to first insight: <30 seconds after clicking "Begin"
- Debate completion rate: >90% of started debates reach synthesis
- User satisfaction: Users can articulate the key trade-off after reading synthesis
