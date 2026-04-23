import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'debates.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface Agent {
  id: string;
  role: 'Advocate' | 'Skeptic' | 'Judge' | 'Fact-checker' | 'Moderator';
  style: string;
  model: string;
  provider: string;
}

export interface Source {
  title: string;
  url: string;
  snippet?: string;
}

export interface Turn {
  id: string;
  n: number;
  role: 'Advocate' | 'Skeptic' | 'Judge' | 'Fact-checker' | 'Moderator';
  style?: string;
  model?: string;
  phase: 'Opening' | 'Cross-Ex' | 'Rebuttal' | 'Final' | 'Synthesis';
  text: string;
  reasoning?: string;
  sources?: Source[];
  timestamp: string;
  isModerator?: boolean;
  flagged?: boolean;
  strong?: string[];
  meta?: boolean;
}

export interface Debate {
  id: string;
  topic: string;
  mode: string;
  agents: Agent[];
  phase: 'Opening' | 'Cross-Ex' | 'Rebuttal' | 'Final' | 'Synthesis';
  round: number;
  totalRounds: number;
  turns: Turn[];
  toggles: {
    factChecking: boolean;
    forceSteelmanning: boolean;
    requireVerdict: boolean;
    scoring: boolean;
  };
  structure: {
    rounds: number;
    turnCap: number;
    crossExAfterRound: number;
    /** When `false`, Cross-Ex is omitted. Omitted in persisted debates = enabled if `crossExAfterRound` is valid. */
    crossExEnabled?: boolean;
    synthesisType: 'judge' | 'judge+system';
  };
  status: 'draft' | 'live' | 'paused' | 'complete';
  createdAt: string;
  currentAgentIndex: number;
  synthesis?: {
    summary: string;
    keyArguments: { advocate: string[]; skeptic: string[] };
    pointsOfAgreement: string[];
    pointsOfDisagreement: string[];
    unresolvedQuestions: string[];
    verdict?: string;
  };
}

class DebateStore {
  private debates: Map<string, Debate> = new Map();
  private saveChain: Promise<void> = Promise.resolve();
  private lastLoadError: string | null = null;

  constructor() {
    this.loadFromDisk();
  }

  /** Non-fatal load/persist issues (e.g. corrupt debates.json). */
  getLastLoadError(): string | null {
    return this.lastLoadError;
  }

  private loadFromDisk(): void {
    this.lastLoadError = null;
    try {
      if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        if (data.trim() === '') {
          return;
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          this.lastLoadError = `Invalid debates JSON: ${msg}`;
          console.error(this.lastLoadError);
          return;
        }
        if (!Array.isArray(parsed)) {
          this.lastLoadError = 'debates.json must contain a JSON array';
          console.error(this.lastLoadError);
          return;
        }
        const debatesArray = parsed.filter(isDebateShape);
        debatesArray.forEach((debate) => {
          this.debates.set(debate.id, debate);
        });
        console.log(`Loaded ${debatesArray.length} debates from disk`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.lastLoadError = msg;
      console.error('Error loading debates from disk:', error);
    }
  }

  private saveToDiskAtomic(): void {
    const debatesArray = Array.from(this.debates.values());
    const payload = JSON.stringify(debatesArray, null, 2);
    const tmpPath = `${DATA_FILE}.${process.pid}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(tmpPath, payload, 'utf-8');
      fs.renameSync(tmpPath, DATA_FILE);
    } catch (error) {
      try {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      } catch {
        /* ignore */
      }
      console.error('Error saving debates to disk:', error);
      throw error;
    }
  }

  private scheduleSave(): void {
    this.saveChain = this.saveChain
      .then(() => {
        this.saveToDiskAtomic();
      })
      .catch((err) => {
        console.error('Persist chain error:', err);
      });
  }

  get(id: string): Debate | undefined {
    return this.debates.get(id);
  }

  set(id: string, debate: Debate): void {
    this.debates.set(id, debate);
    this.scheduleSave();
  }

  getAll(): Debate[] {
    return Array.from(this.debates.values());
  }

  delete(id: string): boolean {
    const result = this.debates.delete(id);
    if (result) {
      this.scheduleSave();
    }
    return result;
  }

  /** Await queued disk writes (tests / shutdown hooks). */
  flushPendingWrites(): Promise<void> {
    return this.saveChain;
  }
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

/** Runtime guard for persisted debates (rejects malformed JSON without crashing). */
export function parseDebatesJson(raw: string): Debate[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isDebateShape);
}

function isDebateShape(v: unknown): v is Debate {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    isNonEmptyString(o.id) &&
    isNonEmptyString(o.topic) &&
    Array.isArray(o.turns) &&
    Array.isArray(o.agents)
  );
}

const store = new DebateStore();

export function getDebateStore(): DebateStore {
  return store;
}

/** Stable prefixed IDs for debates, turns, agents, and queue jobs. */
export function generateId(kind = 'id'): string {
  return `${kind}-${randomUUID()}`;
}

export function createDebateInstance(data: {
  topic: string;
  mode: string;
  agents: { role: string; style: string; model: string; provider: string }[];
  toggles: Debate['toggles'];
  structure: Debate['structure'];
}): Debate {
  const id = generateId('debate');
  const agents: Agent[] = data.agents.map((a) => ({
    id: generateId('agent'),
    role: a.role as Agent['role'],
    style: a.style,
    model: a.model,
    provider: a.provider,
  }));

  // Create initial "Topic" turn so the debate prompt is visible
  const topicTurn: Turn = {
    id: generateId('turn'),
    n: 1,
    role: 'Moderator',
    phase: 'Opening',
    text: data.topic,
    timestamp: new Date().toISOString(),
    isModerator: true,
    meta: true,
  };

  const debate: Debate = {
    id,
    topic: data.topic,
    mode: data.mode,
    agents,
    phase: 'Opening',
    round: 1,
    totalRounds: data.structure.rounds || 4,
    turns: [topicTurn],
    toggles: data.toggles,
    structure: data.structure,
    status: 'live',
    createdAt: new Date().toISOString(),
    currentAgentIndex: 0,
  };

  store.set(id, debate);
  return debate;
}
