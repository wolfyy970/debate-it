import { describe, it, expect } from 'vitest';
import { executeTool, TOOL_DEFINITIONS } from '../../server/lib/tools';

describe('tools', () => {
  describe('TOOL_DEFINITIONS', () => {
    it('has search_web tool defined', () => {
      const searchTool = TOOL_DEFINITIONS.find(t => t.name === 'search_web');
      expect(searchTool).toBeDefined();
      expect(searchTool?.description).toContain('Search the web');
      expect(searchTool?.parameters.query).toBeDefined();
      expect(searchTool?.parameters.reason).toBeDefined();
      expect(searchTool?.required).toContain('query');
      expect(searchTool?.required).toContain('reason');
    });

    it('has read_url tool defined', () => {
      const readTool = TOOL_DEFINITIONS.find(t => t.name === 'read_url');
      expect(readTool).toBeDefined();
      expect(readTool?.description).toContain('web page');
      expect(readTool?.parameters.url).toBeDefined();
      expect(readTool?.parameters.reason).toBeDefined();
      expect(readTool?.required).toContain('url');
      expect(readTool?.required).toContain('reason');
    });

    it('all tools have required parameters', () => {
      TOOL_DEFINITIONS.forEach(tool => {
        expect(tool.required).toBeDefined();
        expect(tool.required!.length).toBeGreaterThan(0);
        tool.required!.forEach(param => {
          expect(tool.parameters[param]).toBeDefined();
        });
      });
    });
  });

  describe('executeTool', () => {
    it('returns error for unknown tool', async () => {
      const result = await executeTool({
        id: 'test_1',
        name: 'unknown_tool',
        arguments: {},
      });

      expect(result.isError).toBe(true);
      expect(result.content).toContain('Unknown tool');
    });

    it('returns error when search_web is missing query', async () => {
      const result = await executeTool({
        id: 'test_2',
        name: 'search_web',
        arguments: {},
      });

      expect(result.isError).toBe(true);
      expect(result.content).toContain('Missing required parameter');
    });

    it('returns error when read_url is missing url', async () => {
      const result = await executeTool({
        id: 'test_3',
        name: 'read_url',
        arguments: {},
      });

      expect(result.isError).toBe(true);
      expect(result.content).toContain('Missing required parameter');
    });

    it('returns successful result structure', async () => {
      // With no TAVILY_API_KEY, search should return fallback
      const result = await executeTool({
        id: 'test_4',
        name: 'search_web',
        arguments: { query: 'test', reason: 'testing' },
      });

      expect(result.toolName).toBe('search_web');
      expect(result.toolCallId).toBe('test_4');
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.sources)).toBe(true);
    });
  });
});
