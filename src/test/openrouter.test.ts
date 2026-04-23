import { describe, it, expect } from 'vitest';
import { checkApiKeys, formatToolsForProvider, buildSystemPrompt } from '../../server/lib/openrouter';

/** Narrowed shape returned by `formatToolsForProvider` for tests. */
type FormattedTool = {
  type: string;
  function: {
    name: string;
    parameters: {
      type: string;
      required: string[];
      properties: Record<string, { type?: string; description?: string; enum?: string[] }>;
    };
  };
};

describe('openrouter', () => {
  describe('checkApiKeys', () => {
    it('returns correct key status when no keys are set', () => {
      const keys = checkApiKeys();
      expect(keys.openrouter).toBe(false);
      expect(keys.kimi).toBe(false);
      expect(keys.tavily).toBe(false);
      expect(keys.hasAny).toBe(false);
      expect(keys.hasAllRequired).toBe(false);
    });

    it('reports hasAllRequired only when an LLM key and Tavily are present', () => {
      const prevTav = process.env.TAVILY_API_KEY;
      process.env.TAVILY_API_KEY = 'tav-key';
      try {
        // openrouter.ts captured the LLM key at module load as '' — so hasAny stays false
        // and hasAllRequired stays false even with Tavily set. That's the contract:
        // both capabilities must be present.
        const keys = checkApiKeys();
        expect(keys.tavily).toBe(true);
        expect(keys.hasAllRequired).toBe(keys.hasAny && keys.tavily);
      } finally {
        if (prevTav === undefined) delete process.env.TAVILY_API_KEY;
        else process.env.TAVILY_API_KEY = prevTav;
      }
    });
  });

  describe('formatToolsForProvider', () => {
    it('formats tools for OpenAI-compatible API', () => {
      const tools = [
        {
          name: 'search_web',
          description: 'Search the web',
          parameters: {
            query: { type: 'string' as const, description: 'Search query' },
            limit: { type: 'number' as const, description: 'Result limit' },
          },
          required: ['query'],
        },
      ];

      const formatted = formatToolsForProvider(tools);
      const row = formatted[0] as FormattedTool;

      expect(formatted).toHaveLength(1);
      expect(row.type).toBe('function');
      expect(row.function.name).toBe('search_web');
      expect(row.function.parameters.type).toBe('object');
      expect(row.function.parameters.required).toEqual(['query']);
      expect(row.function.parameters.properties.query.type).toBe('string');
      expect(row.function.parameters.properties.query.description).toBe('Search query');
    });

    it('handles enum parameters', () => {
      const tools = [
        {
          name: 'test_tool',
          description: 'Test tool',
          parameters: {
            mode: {
              type: 'string' as const,
              description: 'Mode',
              enum: ['fast', 'slow'],
            },
          },
        },
      ];

      const formatted = formatToolsForProvider(tools);
      const row = formatted[0] as FormattedTool;
      expect(row.function.parameters.properties.mode.enum).toEqual(['fast', 'slow']);
    });

    it('defaults required to all parameter keys', () => {
      const tools = [
        {
          name: 'test_tool',
          description: 'Test tool',
          parameters: {
            a: { type: 'string' as const, description: 'Param A' },
            b: { type: 'string' as const, description: 'Param B' },
          },
        },
      ];

      const formatted = formatToolsForProvider(tools);
      const row = formatted[0] as FormattedTool;
      expect(row.function.parameters.required).toEqual(['a', 'b']);
    });
  });

  describe('buildSystemPrompt', () => {
    it('includes role, style, topic, phase, and round', () => {
      const prompt = buildSystemPrompt('Advocate', 'analytical', 'AI safety', 'Opening', 1);

      expect(prompt).toContain('Advocate');
      expect(prompt).toContain('analytical');
      expect(prompt).toContain('AI safety');
      expect(prompt).toContain('Opening');
      expect(prompt).toContain('Round 1');
    });

    it('includes citation rules', () => {
      const prompt = buildSystemPrompt('Advocate', 'data-driven', 'Test', 'Opening', 1);

      expect(prompt).toContain('CITATION RULES');
      expect(prompt).toContain('[1]');
      expect(prompt).toMatch(/do not invent citations/i);
    });

    it('includes tool usage instructions', () => {
      const prompt = buildSystemPrompt('Advocate', 'data-driven', 'Test', 'Opening', 1);

      expect(prompt).toContain('search_web');
      expect(prompt).toContain('read_url');
    });

    it('tells the model not to invent URLs for read_url', () => {
      const prompt = buildSystemPrompt('Advocate', 'data-driven', 'Test', 'Opening', 1);
      expect(prompt).toMatch(/do not invent urls/i);
      expect(prompt).toMatch(/returned by a prior search_web/i);
    });

    it('specifies word count and format', () => {
      const prompt = buildSystemPrompt('Advocate', 'data-driven', 'Test', 'Opening', 1);

      expect(prompt).toContain('200-400 words');
      expect(prompt).toContain('plain text paragraphs');
      expect(prompt).toContain('no markdown');
    });
  });
});
