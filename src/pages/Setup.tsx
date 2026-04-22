import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Masthead,
  Eyebrow,
  Byline,
  Pill,
  Button,
  Toggle,
  Segmented,
  ModelSelect,
} from '../components';
import { useBreakpoint } from '../hooks/useBreakpoint';
import type {
  AgentRole,
  AgentStyle,
  DebateMode,
  DebateToggles,
  DebateStructure,
} from '../types';
import {
  DEBATE_MODES,
  AGENT_STYLES,
} from '../types';

interface AgentConfig {
  id: string;
  role: AgentRole;
  style: AgentStyle;
  model: string;
  provider: string;
}

const DEFAULT_AGENTS: AgentConfig[] = [
  { id: '1', role: 'Advocate', style: 'data-driven', model: 'moonshotai/kimi-k2.6', provider: 'Moonshot' },
  { id: '2', role: 'Skeptic', style: 'philosophical', model: 'moonshotai/kimi-k2.6', provider: 'Moonshot' },
  { id: '3', role: 'Judge', style: 'analytical', model: 'moonshotai/kimi-k2.6', provider: 'Moonshot' },
];

export function SetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const bp = useBreakpoint();
  const initialTopic = (location.state as { topic?: string } | null)?.topic || '';
  const [topic, setTopic] = useState(initialTopic);
  const [selectedMode, setSelectedMode] = useState<DebateMode>('balanced');
  const [agents, setAgents] = useState<AgentConfig[]>(DEFAULT_AGENTS);
  const [openModelSelect, setOpenModelSelect] = useState<string | null>(null);
  const [toggles, setToggles] = useState<DebateToggles>({
    factChecking: true,
    forceSteelmanning: true,
    requireVerdict: false,
    scoring: true,
  });
  const [structure] = useState<DebateStructure>({
    rounds: 4,
    turnCap: 500,
    crossExAfterRound: 2,
    synthesisType: 'judge+system',
  });

  const isMobile = bp === 'mobile';
  const isTablet = bp === 'tablet';
  const gridCols = isMobile ? 1 : isTablet ? 2 : 3;

  const handleCreateDebate = async () => {
    const debateData = {
      topic: topic || 'Should nations implement a four-day workweek as standard policy?',
      mode: selectedMode,
      agents: agents.map(({ role, style, model, provider }) => ({
        role,
        style,
        model,
        provider,
      })),
      toggles,
      structure,
    };

    try {
      const response = await fetch('/api/debates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(debateData),
      });
      
      if (!response.ok) {
        if (response.status === 503) {
          navigate('/error?reason=no-api-keys');
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to create debate:', errorData.message || `HTTP ${response.status}`);
        return;
      }
      
      const debate = await response.json();
      navigate(`/live/${debate.id}`);
    } catch (error) {
      console.error('Failed to create debate:', error);
    }
  };

  const updateAgent = (id: string, updates: Partial<AgentConfig>) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const getAgentColor = (role: AgentRole) => {
    const colors: Record<AgentRole, string> = {
      Advocate: 'var(--advocate)',
      Skeptic: 'var(--skeptic)',
      Judge: 'var(--judge)',
      'Fact-checker': 'var(--factcheck)',
      Moderator: 'var(--ink-700)',
    };
    return colors[role];
  };

  const estimateTime = () => {
    const turns = structure.rounds * 2 + 2;
    const minutes = Math.ceil(turns * 0.5);
    return `\u2248 ${minutes}:${String((turns * 30) % 60).padStart(2, '0')} \u00b7 ${turns} turns`;
  };

  // Sidebar content component
  const Sidebar = () => (
    <div style={{ 
      padding: isMobile ? 'var(--pad-y) var(--pad-x)' : '48px 32px',
      background: isMobile ? 'transparent' : 'var(--paper-2)',
      borderTop: isMobile ? '1px solid var(--ink-200)' : 'none',
    }}>
      <Eyebrow accent>Quick Toggles</Eyebrow>
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Toggle
          on={toggles.factChecking}
          label="Fact-checking"
          hint="Flag unsupported or weakly-evidenced claims."
          onChange={(on) => setToggles({ ...toggles, factChecking: on })}
        />
        <Toggle
          on={toggles.forceSteelmanning}
          label="Force steelmanning"
          hint="Require the strongest version of each claim before rebuttal."
          onChange={(on) => setToggles({ ...toggles, forceSteelmanning: on })}
        />
        <Toggle
          on={toggles.requireVerdict}
          label="Require final verdict"
          hint="Judge must issue a recommendation."
          onChange={(on) => setToggles({ ...toggles, requireVerdict: on })}
        />
        <Toggle
          on={toggles.scoring}
          label="Argument scoring"
          hint="Score each turn on rigor, evidence, and novelty."
          onChange={(on) => setToggles({ ...toggles, scoring: on })}
        />
      </div>

      <div className="rule" style={{ margin: '32px 0' }} />

      <Eyebrow accent>Structure</Eyebrow>
      <div style={{ marginTop: 20 }}>
        <Field label="Rounds" value={String(structure.rounds)} />
        <Field label="Turn cap" value={`~${structure.turnCap} tokens`} />
        <Field label="Cross-Examination" value={`After round ${structure.crossExAfterRound}`} />
        <Field label="Synthesis" value={structure.synthesisType === 'judge+system' ? 'Judge + system' : 'Judge only'} />
      </div>

      <div style={{ marginTop: 40 }}>
        <Button variant="primary" size="lg" full onClick={handleCreateDebate}>
          Begin Debate \u2192
        </Button>
        <div className="t-mono" style={{ fontSize: 11, color: 'var(--ink-500)', textAlign: 'center', marginTop: 10 }}>
          {estimateTime()}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: 'var(--paper)',
      color: 'var(--ink-900)',
      fontFamily: 'var(--font-body)',
    }}>
      <Masthead
        title="DEBATER"
        edition="NEW DEBATE · DRAFT"
        right={
          <Button size="sm" variant="ghost" onClick={() => navigate('/')}>Cancel</Button>
        }
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 340px',
        minHeight: 'calc(100vh - 64px)',
      }}>
        {/* Main */}
        <div style={{
          padding: isMobile ? 'var(--pad-y) var(--pad-x)' : '48px 56px',
          borderRight: isMobile ? 'none' : '1px solid var(--ink-200)',
        }}>
          {/* Topic */}
          <Eyebrow accent>§ 01 · The Question</Eyebrow>
          <div style={{ marginTop: 10, borderBottom: '1px solid var(--ink-900)', paddingBottom: 20 }}>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Should nations implement a four-day workweek as standard policy?"
              style={{
                width: '100%',
                fontFamily: 'var(--font-display)',
                fontWeight: 400,
                fontSize: 'var(--fs-title)',
                lineHeight: 1.08,
                color: 'var(--ink-900)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                letterSpacing: 'var(--tr-tight)',
              }}
              rows={2}
            />
            <div style={{ marginTop: 18 }}>
              <div className="t-meta" style={{ color: 'var(--ink-500)' }}>
                {topic.length} characters
              </div>
            </div>
          </div>

          {/* Mode selector */}
          <div style={{ marginTop: 48 }}>
            <Eyebrow accent>§ 02 · Debate Mode</Eyebrow>
            <div style={{
              marginTop: 16,
              display: 'grid',
              gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
              gap: 16,
            }}>
              {DEBATE_MODES.map(({ name, description, key }) => (
                <div
                  key={key}
                  onClick={() => setSelectedMode(key)}
                  style={{
                    border: selectedMode === key ? '1px solid var(--ink-900)' : '1px solid var(--ink-200)',
                    background: selectedMode === key ? 'var(--paper-0)' : 'transparent',
                    padding: 20,
                    position: 'relative',
                    cursor: 'pointer',
                    boxShadow: selectedMode === key ? 'inset 0 0 0 1px var(--ink-900)' : 'none',
                  }}
                >
                  {selectedMode === key && (
                    <div style={{ position: 'absolute', top: 12, right: 12 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14">
                        <path d="M2 7l3 3 7-7" fill="none" stroke="var(--accent)" strokeWidth="2"/>
                      </svg>
                    </div>
                  )}
                  <div className="t-head" style={{ fontSize: 18, marginBottom: 8 }}>{name}</div>
                  <div className="t-ui" style={{ fontSize: 13, color: 'var(--ink-500)', lineHeight: 1.5 }}>
                    {description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Agents */}
          <div style={{ marginTop: 48 }}>
            <Eyebrow accent>§ 03 · The Agents</Eyebrow>
            <div className="t-body" style={{ color: 'var(--ink-500)', fontSize: 14, marginTop: 4 }}>
              Three voices. Each is assigned a role, style, and model.
            </div>

            <div style={{
              marginTop: 20,
              display: 'grid',
              gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
              gap: 16,
            }}>
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  style={{
                    border: '1px solid var(--ink-200)',
                    background: 'var(--paper-0)',
                    position: 'relative',
                  }}
                >
                  <div style={{
                    borderTop: `3px solid ${getAgentColor(agent.role)}`,
                    padding: '16px 18px',
                    borderBottom: '1px solid var(--ink-200)',
                  }}>
                    <Byline role={agent.role} style={agent.style} />
                  </div>
                  <div style={{ padding: 18 }}>
                    <div className="t-meta" style={{ marginBottom: 8 }}>Model</div>
                    <ModelSelect
                      value={agent.model}
                      provider={agent.provider}
                      color={getAgentColor(agent.role)}
                      open={openModelSelect === agent.id}
                      onToggle={() => setOpenModelSelect(openModelSelect === agent.id ? null : agent.id)}
                      onSelect={(model, provider) => {
                        updateAgent(agent.id, { model, provider });
                        setOpenModelSelect(null);
                      }}
                    />

                    <div className="t-meta" style={{ margin: '18px 0 8px' }}>Role</div>
                    <Segmented
                      options={['Advocate', 'Skeptic', 'Judge']}
                      value={agent.role}
                      onChange={(role) => updateAgent(agent.id, { role: role as AgentRole })}
                    />

                    <div className="t-meta" style={{ margin: '18px 0 8px' }}>Style</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {AGENT_STYLES.map((s) => (
                        <Pill
                          key={s}
                          active={s === agent.style}
                          onClick={() => updateAgent(agent.id, { style: s })}
                        >
                          {s}
                        </Pill>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar - below on mobile, right on desktop */}
        {isMobile ? <Sidebar /> : (
          <aside style={{ background: 'var(--paper-2)' }}>
            <Sidebar />
          </aside>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: '1px solid var(--ink-100)',
    }}>
      <span className="t-ui" style={{ fontSize: 13, color: 'var(--ink-500)' }}>{label}</span>
      <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink-900)' }}>{value}</span>
    </div>
  );
}
