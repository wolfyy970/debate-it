import fs from 'fs';
import path from 'path';
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
  private initialized = false;

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        const debatesArray: Debate[] = JSON.parse(data);
        debatesArray.forEach(debate => {
          this.debates.set(debate.id, debate);
        });
        console.log(`Loaded ${debatesArray.length} debates from disk`);
      }
    } catch (error) {
      console.error('Error loading debates from disk:', error);
    }
    this.initialized = true;
  }

  private saveToDisk(): void {
    try {
      const debatesArray = Array.from(this.debates.values());
      fs.writeFileSync(DATA_FILE, JSON.stringify(debatesArray, null, 2));
    } catch (error) {
      console.error('Error saving debates to disk:', error);
    }
  }

  get(id: string): Debate | undefined {
    return this.debates.get(id);
  }

  set(id: string, debate: Debate): void {
    this.debates.set(id, debate);
    this.saveToDisk();
  }

  getAll(): Debate[] {
    return Array.from(this.debates.values());
  }

  delete(id: string): boolean {
    const result = this.debates.delete(id);
    if (result) {
      this.saveToDisk();
    }
    return result;
  }
}

const store = new DebateStore();

export function getDebateStore(): DebateStore {
  return store;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36).substring(2, 6);
}

export function getNextPhase(currentPhase: string, round: number, crossExAfterRound: number): string {
  const phases = ['Opening', 'Cross-Ex', 'Rebuttal', 'Final', 'Synthesis'];
  const idx = phases.indexOf(currentPhase);

  if (currentPhase === 'Opening') return 'Cross-Ex';
  if (currentPhase === 'Cross-Ex') return 'Rebuttal';
  if (currentPhase === 'Rebuttal' && round < 4) {
    return 'Opening';
  }
  if (currentPhase === 'Rebuttal' && round >= 4) return 'Final';
  if (currentPhase === 'Final') return 'Synthesis';

  return phases[idx + 1] || 'Synthesis';
}

export function getNextAgent(debate: Debate): Agent {
  const roles = ['Advocate', 'Skeptic'];

  // If no turns yet, Advocate goes first
  if (debate.turns.length === 0) {
    return debate.agents.find(a => a.role === 'Advocate') || debate.agents[0];
  }

  const currentRole = debate.turns[debate.turns.length - 1].role;
  const currentIdx = roles.indexOf(currentRole);
  const nextIdx = (currentIdx + 1) % roles.length;

  const nextRole = roles[nextIdx] as Agent['role'];
  return debate.agents.find(a => a.role === nextRole) || debate.agents[0];
}

export function createDebateInstance(data: {
  topic: string;
  mode: string;
  agents: { role: string; style: string; model: string; provider: string }[];
  toggles: Debate['toggles'];
  structure: Debate['structure'];
}): Debate {
  const id = generateId();
  const agents: Agent[] = data.agents.map((a) => ({
    id: generateId(),
    role: a.role as Agent['role'],
    style: a.style,
    model: a.model,
    provider: a.provider,
  }));

  // Create initial "Topic" turn so the debate prompt is visible
  const topicTurn: Turn = {
    id: generateId(),
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