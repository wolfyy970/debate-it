import type { Dispatch, SetStateAction } from 'react';
import { Button, Eyebrow, Toggle } from '../components';
import type { DebateStructure, DebateToggles } from '../types';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: '1px solid var(--ink-100)',
      }}
    >
      <span className="t-ui" style={{ fontSize: 13, color: 'var(--ink-500)' }}>
        {label}
      </span>
      <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink-900)' }}>
        {value}
      </span>
    </div>
  );
}

export function SetupSidebar({
  isMobile,
  toggles,
  setToggles,
  structure,
  estimateTime,
  onBeginDebate,
}: {
  isMobile: boolean;
  toggles: DebateToggles;
  setToggles: Dispatch<SetStateAction<DebateToggles>>;
  structure: DebateStructure;
  estimateTime: () => string;
  onBeginDebate: () => void;
}) {
  return (
    <div
      style={{
        padding: isMobile ? 'var(--pad-y) var(--pad-x)' : '48px 32px',
        background: isMobile ? 'transparent' : 'var(--paper-2)',
        borderTop: isMobile ? '1px solid var(--ink-200)' : 'none',
      }}
    >
      <Eyebrow accent>Quick Toggles</Eyebrow>
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Toggle
          on={toggles.factChecking}
          label="Fact-checking"
          hint="Flag unsupported or weakly-evidenced claims."
          onChange={(on) => setToggles((t) => ({ ...t, factChecking: on }))}
        />
        <Toggle
          on={toggles.forceSteelmanning}
          label="Force steelmanning"
          hint="Require the strongest version of each claim before rebuttal."
          onChange={(on) => setToggles((t) => ({ ...t, forceSteelmanning: on }))}
        />
        <Toggle
          on={toggles.requireVerdict}
          label="Require final verdict"
          hint="Judge must issue a recommendation."
          onChange={(on) => setToggles((t) => ({ ...t, requireVerdict: on }))}
        />
        <Toggle
          on={toggles.scoring}
          label="Argument scoring"
          hint="Score each turn on rigor, evidence, and novelty."
          onChange={(on) => setToggles((t) => ({ ...t, scoring: on }))}
        />
      </div>

      <div className="rule" style={{ margin: '32px 0' }} />

      <Eyebrow accent>Structure</Eyebrow>
      <div style={{ marginTop: 20 }}>
        <Field label="Rounds" value={String(structure.rounds)} />
        <Field label="Turn cap" value={`~${structure.turnCap} tokens`} />
        {/* crossExAfterRound is persisted for product context; live phase transitions use fixed lengths in the engine. */}
        <Field label="Cross-Examination" value={`After round ${structure.crossExAfterRound}`} />
        <Field
          label="Synthesis"
          value={structure.synthesisType === 'judge+system' ? 'Judge + system' : 'Judge only'}
        />
      </div>

      <div style={{ marginTop: 40 }}>
        <Button variant="primary" size="lg" full onClick={onBeginDebate}>
          Begin Debate →
        </Button>
        <div className="t-mono" style={{ fontSize: 11, color: 'var(--ink-500)', textAlign: 'center', marginTop: 10 }}>
          {estimateTime()}
        </div>
      </div>
    </div>
  );
}
