import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Masthead,
  Eyebrow,
  Byline,
  Pill,
  Button,
  ModelSelect,
} from '../components';
import { useBreakpoint } from '../hooks/useBreakpoint';
import type { AgentRole, AgentStyle, DebateMode, DebateStructure, CreateDebateRequest } from '../types';
import { getRoleColorToken } from '../theme/roleColors';
import { DEBATE_MODES, AGENT_STYLES } from '../types';
import { apiUrl } from '../lib/apiBase';
import { missingKeysErrorPath, parseMissingKeys } from '../lib/apiErrors';
import { buildSchedule, formatScheduleEstimateFooter } from '../lib/debateSchedule';
import { PhaseStrip } from '../components/debate/PhaseStrip';

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

/** Toggles are not wired in the engine; API still expects the object. */
const UNWIRED_TOGGLES = {
  factChecking: false,
  forceSteelmanning: false,
  requireVerdict: false,
  scoring: false,
} as const;

const ROUND_OPTIONS = [2, 3, 4, 5, 6, 8] as const;

export function SetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, isTablet, stackShell } = useBreakpoint();
  const initialTopic = (location.state as { topic?: string } | null)?.topic || '';
  const [topic, setTopic] = useState(initialTopic);
  const [selectedMode, setSelectedMode] = useState<DebateMode>('balanced');
  const [agents, setAgents] = useState<AgentConfig[]>(DEFAULT_AGENTS);
  const [openModelSelect, setOpenModelSelect] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [structure, setStructure] = useState<DebateStructure>({
    rounds: 4,
    turnCap: 1_000_000,
    crossExAfterRound: 2,
    crossExEnabled: true,
    synthesisType: 'judge',
  });

  const gridCols = isMobile ? 1 : isTablet ? 2 : 3;
  const agentBlockCols = isMobile ? 1 : isTablet ? 2 : 3;

  const handleCreateDebate = async () => {
    setCreateError(null);
    setOpenModelSelect(null);
    setIsSubmitting(true);

    const debateData: CreateDebateRequest = {
      topic: topic || 'Should nations implement a four-day workweek as standard policy?',
      mode: selectedMode,
      agents: agents.map(({ role, style, model, provider }) => ({
        role,
        style,
        model,
        provider,
      })),
      toggles: { ...UNWIRED_TOGGLES },
      structure,
    };

    try {
      const response = await fetch(apiUrl('/api/debates'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(debateData),
      });

      if (!response.ok) {
        if (response.status === 503) {
          const missing = await parseMissingKeys(response);
          navigate(missingKeysErrorPath(missing));
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        const msg =
          typeof errorData.message === 'string'
            ? errorData.message
            : `Could not start debate (HTTP ${response.status}).`;
        setCreateError(msg);
        return;
      }

      const debate = await response.json();
      navigate(`/live/${debate.id}`);
    } catch (error) {
      const message =
        error instanceof TypeError
          ? 'Could not reach the server. Start the API (see README) or check the dev proxy.'
          : error instanceof Error
            ? error.message
            : 'Something went wrong while starting the debate.';
      setCreateError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateAgent = (id: string, updates: Partial<Omit<AgentConfig, 'role'>>) => {
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  const schedulePreview = buildSchedule(structure);

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: 'var(--paper)',
      color: 'var(--ink-900)',
      fontFamily: 'var(--font-body)',
    }}>
      <Masthead title="DEBATER" edition="NEW DEBATE · DRAFT" compact={stackShell} />

      <div
        style={{
          minHeight: 'calc(100vh - 64px)',
          padding: stackShell ? 'var(--pad-y) var(--pad-x)' : '48px 56px',
        }}
      >
          {/* Topic */}
          <Eyebrow accent>01 · The Question</Eyebrow>
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
            <Eyebrow accent>02 · Debate Mode</Eyebrow>
            <div style={{
              marginTop: 16,
              display: 'grid',
              gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
              gap: 16,
            }}>
              {DEBATE_MODES.map(({ name, description, key }) => (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  className="debater-setup-mode"
                  onClick={() => setSelectedMode(key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedMode(key);
                    }
                  }}
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
            <Eyebrow accent>03 · The Agents</Eyebrow>
            <div className="t-body" style={{ color: 'var(--ink-500)', fontSize: 14, marginTop: 4 }}>
              Advocate, Skeptic, and Judge — fixed roles. Choose model and style for each.
            </div>

            <div style={{
              marginTop: 20,
              display: 'grid',
              gridTemplateColumns: `repeat(${agentBlockCols}, 1fr)`,
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
                    borderTop: `3px solid ${getRoleColorToken(agent.role)}`,
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
                      color={getRoleColorToken(agent.role)}
                      open={openModelSelect === agent.id}
                      onToggle={() => setOpenModelSelect(openModelSelect === agent.id ? null : agent.id)}
                      onSelect={(model, provider) => {
                        updateAgent(agent.id, { model, provider });
                        setOpenModelSelect(null);
                      }}
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

          {/* Structure — same flow as former sidebar, inline after agents */}
          <div style={{ marginTop: 48 }}>
            <Eyebrow accent>04 · Structure</Eyebrow>
            <div className="t-body" style={{ color: 'var(--ink-500)', fontSize: 14, marginTop: 4 }}>
              Debate length and how the session closes.
            </div>
            <div
              style={{
                marginTop: 20,
                border: '1px solid var(--ink-200)',
                background: 'var(--paper-0)',
                padding: 18,
              }}
            >
              <div className="t-meta" style={{ marginBottom: 10 }}>Rounds</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ROUND_OPTIONS.map((n) => (
                  <Pill
                    key={n}
                    active={structure.rounds === n}
                    onClick={() =>
                      setStructure((s) => {
                        const rounds = n;
                        const maxCe = Math.max(1, rounds - 1);
                        let ce = s.crossExAfterRound;
                        if (ce > maxCe) ce = Math.max(1, Math.floor(rounds / 2));
                        ce = Math.min(Math.max(1, ce), maxCe);
                        return { ...s, rounds, crossExAfterRound: ce };
                      })
                    }
                  >
                    {n}
                  </Pill>
                ))}
              </div>
              <div className="t-meta" style={{ marginTop: 14, color: 'var(--ink-600)' }}>
                Cross-examination
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, alignItems: 'center' }}>
                <Pill
                  active={structure.crossExEnabled !== false}
                  onClick={() =>
                    setStructure((s) => {
                      const on = s.crossExEnabled !== false;
                      return { ...s, crossExEnabled: !on };
                    })
                  }
                >
                  {structure.crossExEnabled === false ? 'Cross-ex · off' : 'Cross-ex · on'}
                </Pill>
                {structure.crossExEnabled !== false && (
                  <>
                    <span className="t-ui" style={{ fontSize: 12, color: 'var(--ink-500)' }}>
                      After round
                    </span>
                    {Array.from({ length: Math.max(1, structure.rounds - 1) }, (_, i) => i + 1).map((r) => (
                      <Pill
                        key={r}
                        active={structure.crossExAfterRound === r}
                        onClick={() => setStructure((s) => ({ ...s, crossExAfterRound: r }))}
                      >
                        {r}
                      </Pill>
                    ))}
                  </>
                )}
              </div>
              <div className="t-meta" style={{ marginTop: 14, color: 'var(--ink-600)' }}>
                Schedule preview
              </div>
              <div style={{ marginTop: 8 }}>
                <PhaseStrip segments={schedulePreview} activeSegmentIndex={null} variant="preview" />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginTop: 18,
                  paddingTop: 18,
                  borderTop: '1px solid var(--ink-100)',
                }}
              >
                <span className="t-ui" style={{ fontSize: 13, color: 'var(--ink-500)' }}>
                  Synthesis
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Pill
                    active={structure.synthesisType === 'judge'}
                    onClick={() => setStructure((s) => ({ ...s, synthesisType: 'judge' }))}
                  >
                    Judge
                  </Pill>
                  <Pill
                    active={structure.synthesisType === 'judge+system'}
                    onClick={() => setStructure((s) => ({ ...s, synthesisType: 'judge+system' }))}
                  >
                    Judge + system
                  </Pill>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 40,
              marginBottom: 48,
              display: 'flex',
              flexWrap: 'wrap',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {createError && (
              <div
                role="alert"
                className="t-ui"
                style={{
                  fontSize: 13,
                  color: 'var(--danger)',
                  border: '1px solid var(--danger)',
                  padding: '12px 14px',
                  background: 'var(--skeptic-bg)',
                }}
              >
                {createError}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              <Button size="md" variant="ghost" onClick={() => navigate('/')}>
                Cancel
              </Button>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <Button
                  size="lg"
                  variant="primary"
                  disabled={isSubmitting}
                  onClick={handleCreateDebate}
                >
                  {isSubmitting ? 'Starting…' : 'Begin Debate →'}
                </Button>
                <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>
                  {formatScheduleEstimateFooter(structure)}
                </span>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
