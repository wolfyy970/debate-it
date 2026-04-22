# Documentation Philosophy

## Core Principle

**Documentation serves as persistent memory between human and AI collaborators across context windows.** Well-structured docs enable seamless continuation without loss of critical knowledge. **Assistant sessions do not retain prior conversation**—the handoff is this documentation.

**The cardinal rule: Just enough, no more.** Every line must earn its place. If information can be derived from code or official docs, don't duplicate it.

---

## Document Structure

**README.md is the ONLY entry point.** All other docs link from it. No intermediary navigation files.

- **[README.md](README.md)** — Hub and entry point
  - **[SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)** — Narrative: canvas roles, prompts, agentic loop, evaluation
  - **[PRODUCT.md](PRODUCT.md)** — **North Star** + feature spec (what exists)
  - **[USER_GUIDE.md](USER_GUIDE.md)** — Setup and workflow; 
  - **[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)** — SPA design tokens (Indigo palette, light + dark themes): accent vs status, typography triad (body / display / mono / wordmark), atoms (handle, chip, left-rail, buttons, scorecard bar), file-role colors. 
  - **ARCHITECTURE.md](ARCHITECTURE.md)** — Technical reference: routes, modules, data flow, etc

---

## Document Types


| Document             | Purpose                                                      | Update Trigger                                               |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **README.md**        | Entry point, quick start, doc map                            | Major features                                               |
| **PRODUCT.md**       | **North Star** + feature source of truth (prevents hallucination) | Feature launches, mission/scope changes                      |
| **USER_GUIDE.md**    | Setup, canvas workflow, managing specs; **§ Version history** — **`pnpm snap`** | UX changes; or editing prompts/skills/rubric by hand         |
| **DESIGN_SYSTEM.md** | SPA token semantics (package shell at `packages/design-system/`: `tokens.json` → generated `:root`/`.dark` CSS; `@theme inline` utility registration in `globals.css`), Indigo palette + sage/amber status, typography triad, atoms (`Button`, `Badge`, handle, rail, scorecard bar), threshold-colored scorecard, DS drift guards | New semantic colors/roles, **font stack / wordmark / display** changes, new atoms, token naming, theme changes |
| **ARCHITECTURE.md**  | System design, module boundaries, data flow, Pi sandbox (three-layer contract + tool inventory + edit resilience) | Architecture changes                                         |
| **DOCUMENTATION.md** | Meta: documentation philosophy and rules                     | Rarely                                                       |


---

## Writing Rules

1. **One source of truth** — Each fact lives in exactly one place
2. **Link, don't duplicate** — Reference other docs instead of copying
3. **Practical over theoretical** — Working code > abstract explanations
4. **Assume knowledge gaps** — Explain "why" along with "how"
5. **Structure for scanning** — Clear headings, bullets, tables

---

## What NOT to Document

- ❌ Standard library/framework behavior (link to official docs)
- ❌ Obvious code patterns
- ❌ Extensive templates and examples (one suffices)
- ❌ Step-by-step tutorials for common operations
- ❌ Information derivable from reading the code

---

## Success Metrics

Documentation is working when:

- New collaborators understand the project in <10 minutes
- Getting it running takes <15 minutes
- Finding specific information takes <2 minutes
- AI assistants can resume work seamlessly across context windows
- Be ruthless:** Delete obsolete content. Consolidate redundant docs. Prefer focused and impactful over comprehensive.