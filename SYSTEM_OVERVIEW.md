# System Overview

## What is Debater?

Debater is a structured AI debate platform. Users pose a question, configure AI agents with specific roles (Advocate, Skeptic, Judge), and watch them debate through structured phases — culminating in a synthesized analysis with key arguments, points of agreement/disagreement, and a reasoned verdict.

The core principle: **the debate is not the product. The insight is.**

## Debate Flow

### Phases and schedule

The flow is **not** a fixed five-phase script for every debate. A **canonical schedule** is built from **`structure`**: how many **rounds** (each round is one Advocate + one Skeptic segment), whether **cross-examination** runs (and after which round), a **`turnCap`** safety limit, and how the judge **synthesis** prompt is framed. Segments can include **Opening**, optional **Cross-Ex**, one or more numbered **Rebuttals**, **Final**, then **Synthesis** when agent turns are finished. The same schedule drives the server, the setup preview, and the live phase strip. Rules live in **`shared/debate-schedule.ts`** (see **ARCHITECTURE.md**).

### Turn rules (summary)

- Within each two-speaker segment, **Advocate** speaks first, then **Skeptic**; the server picks the next role from the flattened schedule (not from raw “last turn in array” alternation).
- **Moderator** clarifying questions during Cross-Ex do not advance the agent schedule.
- When the schedule (and `turnCap`) say there are no agent turns left, **`POST /next`** returns **409** with `reason: schedule_complete`; the user ends with **End & Synthesize** for the judge document.

## Agents

### Roles

| Role | Purpose | Color |
|------|---------|-------|
| **Advocate** | Argues in favor of the proposition | Navy (#1e3a5c) |
| **Skeptic** | Argues against, critiques weaknesses | Oxblood (#7a1f1f) |
| **Judge** | Synthesizes arguments, issues verdict | Warm gray (#4a4438) |
| **Moderator** | Asks clarifying questions (Cross-Ex only) | — |

### Styles

- **Analytical** — Logic-first, evidence-based
- **Emotional** — Values-driven, rhetorical
- **Data-driven** — Statistics, studies, quantified claims
- **Philosophical** — Principles, frameworks, thought experiments

## Agentic Loop (ReAct)

Each agent runs a ReAct-style loop:

1. Receives system prompt with role, style, topic, phase, round
2. Streams LLM response in real-time (SSE)
3. Detects tool calls mid-generation (search_web, read_url)
4. Executes tools and feeds results back into context
5. Continues loop until LLM signals completion (max 8 iterations), then if the body would still be empty, runs one **no-tools** prose-only pass; if text is still empty, the turn errors instead of saving
6. Parses search results into structured sources with inline citations

### Tools

- **search_web** — Query Tavily API for factual information
- **read_url** — Fetch and parse webpage content (HTML stripping, 8000 char limit)

Citations use bracketed numbers [1], [2] inline in the argument text.

## Evaluation

### Synthesis Output

The Judge produces:

- **Summary** — Brief overview of the debate
- **Key Arguments** — Advocate and Skeptic positions
- **Points of Agreement** — Common ground found
- **Points of Disagreement** — Irreconcilable differences
- **Unresolved Questions** — Open issues requiring more evidence
- **Verdict** — Reasoned conclusion (Decision mode only)

### Optional Toggles

- **Fact-checking** — Flag unsupported or weakly-evidenced claims
- **Force steelmanning** — Require strongest version of each claim before rebuttal
- **Require final verdict** — Judge must issue a recommendation
- **Argument scoring** — Score each turn on rigor, evidence, and novelty

## Modes

| Mode | Description |
|------|-------------|
| **Balanced Analysis** | Structured rounds, neutral tone, synthesis |
| **Adversarial Debate** | Strong opposition, emphasis on critique |
| **Decision Mode** | Focused on choosing, judge issues recommendation |
| **Educational Mode** | Slower pacing, concepts explained |
| **Devil's Advocate** | One agent pushes extreme counterarguments |
