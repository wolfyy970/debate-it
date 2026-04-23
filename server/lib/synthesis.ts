import type { Debate, Turn } from './store';

export interface SynthesisPayload {
  summary: string;
  keyArguments: { advocate: string[]; skeptic: string[] };
  pointsOfAgreement: string[];
  pointsOfDisagreement: string[];
  unresolvedQuestions: string[];
  verdict?: string;
}

const SYNOPSIS_LEN = 500;
const FALLBACK_SNIP_LEN = 150;

export function buildSynthesisUserContent(debate: Debate): string {
  return `DEBATE TOPIC: ${debate.topic}\n\nTURNS:\n${debate.turns
    .map(
      (t) =>
        `[${t.role} - ${t.phase} #${t.n}]: ${t.text.substring(0, SYNOPSIS_LEN)}${t.text.length > SYNOPSIS_LEN ? '...' : ''}`
    )
    .join('\n\n')}`;
}

export function buildSynthesisMessages(
  debate: Debate,
  synthesisType: Debate['structure']['synthesisType'] = 'judge',
): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  const systemExtra =
    synthesisType === 'judge+system'
      ? '\n- Also include a brief "system" layer: practical stakes, risks, and guardrails beyond what either debater said verbatim.'
      : '';

  return [
    {
      role: 'system',
      content: `You are the Judge. Analyze this debate and produce a structured synthesis.

Guidelines:
- Be objective and evidence-based
- Identify genuine agreements
- Distinguish factual from values-based disagreements
- Note where evidence is lacking
- Issue a clear, reasoned verdict${systemExtra}

Output format (JSON):
{
  "summary": "brief overview",
  "keyArguments": { "advocate": ["point 1", "point 2"], "skeptic": ["point 1", "point 2"] },
  "pointsOfAgreement": ["point 1"],
  "pointsOfDisagreement": ["point 1"],
  "unresolvedQuestions": ["question 1"],
  "verdict": "reasoned conclusion"
}`,
    },
    {
      role: 'user',
      content: buildSynthesisUserContent(debate),
    },
  ];
}

export function parseSynthesisJsonFromModelText(synthesisText: string): SynthesisPayload {
  const jsonMatch = synthesisText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse synthesis JSON');
  }
  return JSON.parse(jsonMatch[0]) as SynthesisPayload;
}

export function generateFallbackSynthesis(debate: Debate): SynthesisPayload {
  const advocateTurns = debate.turns.filter((t: Turn) => t.role === 'Advocate');
  const skepticTurns = debate.turns.filter((t: Turn) => t.role === 'Skeptic');

  return {
    summary:
      'The debate explored the merits and challenges of the topic. Both sides presented evidence-based arguments, with the Advocate focusing on supporting data and the Skeptic examining implications and limitations.',
    keyArguments: {
      advocate: advocateTurns.slice(0, 3).map((t) => t.text.substring(0, FALLBACK_SNIP_LEN) + '...'),
      skeptic: skepticTurns.slice(0, 3).map((t) => t.text.substring(0, FALLBACK_SNIP_LEN) + '...'),
    },
    pointsOfAgreement: [
      'Both sides acknowledged the complexity of the issue',
      'Evidence-based reasoning is essential for sound conclusions',
    ],
    pointsOfDisagreement: [
      'The weight to assign different types of evidence',
      'The practical implications of the proposed position',
    ],
    unresolvedQuestions: [
      'What additional evidence would help resolve the key disagreements?',
      'How do we balance short-term and long-term considerations?',
    ],
    verdict:
      'The evidence supports a nuanced position that acknowledges both the potential benefits and the legitimate concerns raised during the debate.',
  };
}
