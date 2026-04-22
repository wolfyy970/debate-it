## **Debater Web App — Product Specification**

------

## **1. Overview**

**Working Name:** Debater
 **Category:** AI reasoning / decision-support tool

**Core Idea:**
 A web app where multiple AI agents debate a topic under structured rules to produce **clear, balanced, and useful outputs**—not just arguments, but synthesized insights.

**Primary Value:**
 Turn complex questions into:

- well-structured arguments
- clarified trade-offs
- actionable conclusions

------

## **2. Goals & Non-Goals**

### **Goals**

- Deliver **high-quality reasoning**, not just back-and-forth text
- Provide **clear outputs** (summary, key arguments, conclusions)
- Be **easy to use initially**, powerful when customized
- Support **decision-making, learning, and analysis**

### **Non-Goals**

- Pure entertainment chatbot debates
- Fully open-ended sandbox with no structure
- Real-time human-like conversation mimicry

------

## **3. Target Users**

- Students (essay prep, critical thinking)
- Professionals (decision analysis, strategy)
- Researchers (exploring arguments)
- Curious users (understanding both sides of a topic)

------

## **4. Core Features**

### **4.1 Debate Engine**

Multi-agent system where each agent:

- Has a defined **role**
- Operates under **constraints**
- Takes turns in a structured format

#### **Default Agents**

- **Advocate** — builds strongest case for a position
- **Skeptic** — challenges assumptions and logic
- **Judge (optional)** — evaluates arguments and synthesizes output

#### **Optional Agents**

- **Fact-checker** — flags weak or unsupported claims
- **Steelman** — strengthens opponent’s argument before rebuttal

------

### **4.2 Debate Modes (Primary Control)**

Top-level presets that define debate behavior.

#### **Example Modes**

**1. Balanced Analysis (Default)**

- Structured rounds
- Neutral tone
- Ends with synthesis

**2. Adversarial Debate**

- Strong opposition
- Emphasis on critique
- No forced agreement

**3. Decision Mode**

- Focus on choosing best option
- Includes final recommendation
- Judge required

**4. Educational Mode**

- Slower pacing
- Explanations included
- Beginner-friendly

**5. Devil’s Advocate Mode**

- One agent pushes extreme counterarguments

------

### **4.3 Debate Structure**

Each debate follows defined phases:

1. **Opening Statements**
2. **Cross-Examination** (question-only round)
3. **Rebuttals**
4. **Final Statements**
5. **Synthesis (Judge or system-generated)**

Configurable:

- Turn limits
- Token limits per response
- Number of rounds

------

### **4.4 Agent Customization (Advanced)**

Users can modify agents within constraints of selected mode.

#### **Per-Agent Options**

**Role**

- Advocate
- Skeptic
- Judge
- Fact-checker
- Steelman

**Style**

- Analytical
- Emotional
- Data-driven
- Philosophical

**Constraints**

- Evidence-only reasoning
- Worst-case assumptions
- Domain-specific expertise
- Concise vs detailed

------

### **4.5 Quick Toggles (High-Impact Controls)**

Accessible without deep configuration:

- 🔍 Enable Fact-Checking
- 🧠 Force Steelmanning
- ⚖️ Require Final Verdict
- 📊 Show Argument Scoring

------

### **4.6 Output Layer (Key Differentiator)**

Each debate produces structured results:

#### **Core Outputs**

- **Summary**
- **Key arguments (per side)**
- **Points of agreement**
- **Points of disagreement**
- **Unresolved questions**

#### **Optional Outputs**

- **Final verdict / recommendation**
- **Confidence score**
- **Argument strength ranking**

------

### **4.7 Visualization**

Enhance readability and insight:

- Side-by-side arguments
- Highlighted contradictions
- Argument progression timeline
- Strength scoring indicators

------

### **4.8 Memory & Iteration**

- Save debates
- Fork debates with modified assumptions
- Compare different runs
- Track how conclusions evolve

------

### **4.9 Custom Modes**

Users can:

- Save configurations as reusable modes
- Name and reuse setups (e.g., “Thesis Prep Mode”)

------

## **5. User Experience (UX)**

### **5.1 Layout**

**Top Bar**

- Debate Mode dropdown

**Main Panel**

- Topic input
- Agent cards (2–3 visible)

**Agent Cards**

- Role selector
- Style selector
- Expand for advanced constraints

**Side Panel**

- Quick toggles
- Output settings

**Bottom Section**

- Start debate button
- Progress indicator

------

### **5.2 Flow**

1. User enters topic
2. Selects Debate Mode
3. (Optional) adjusts agents or toggles
4. Starts debate
5. Watches structured progression
6. Receives synthesized output
7. Saves or forks debate

------

## **6. Safeguards & Constraints**

### **Prevent Weak Configurations**

- Warn if:
  - No opposing roles
  - Missing synthesis agent
  - Redundant agent roles

### **Mitigate Common Issues**

- Repetition loops → enforce turn structure
- Hallucinations → fact-checker + constraints
- Imbalance → normalize agent prompts
- Endless debates → capped rounds + forced synthesis

------

## **7. Technical Considerations**

### **Architecture**

- Multi-agent orchestration layer
- Prompt templates per role + mode
- Turn-based execution engine
- Output parser for structured summaries

### **Model Strategy**

- Option A: Single LLM with role prompting
- Option B: Multiple LLMs with distinct behaviors

### **Storage**

- Debate history
- User-defined modes
- Iteration trees (forked debates)

------

## **8. MVP Scope**

### **Must Have**

- Topic input
- 2 agents (Advocate vs Skeptic)
- 2–3 Debate Modes
- Structured rounds
- Basic summary output

### **Should Have**

- Judge synthesis
- Quick toggles (fact-check, verdict)
- Save debates

### **Nice to Have**

- Visualization
- Custom modes
- Forking debates

------

## **9. Future Opportunities**

- Train scoring model on high-quality debates
- Integrate external data sources for fact-checking
- Collaborative debates (multiple users)
- API access for developers
- Domain-specific modes (legal, medical, business)

------

## **10. Key Product Principle**

The debate is not the product — the **insight is**.

All design decisions should prioritize:

- clarity over verbosity
- structure over chaos
- usefulness over novelty