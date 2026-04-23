import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  formatSearchResults,
  searchWeb,
  SearchUnavailableError,
  hasTavilyKey,
} from '../../server/lib/search';

describe('search', () => {
  describe('hasTavilyKey / searchWeb without a key', () => {
    const prev = process.env.TAVILY_API_KEY;

    afterEach(() => {
      if (prev === undefined) delete process.env.TAVILY_API_KEY;
      else process.env.TAVILY_API_KEY = prev;
      vi.restoreAllMocks();
    });

    it('reports no Tavily key and refuses to call Tavily', async () => {
      delete process.env.TAVILY_API_KEY;
      expect(hasTavilyKey()).toBe(false);

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('{}', { status: 200 }),
      );

      await expect(searchWeb('anything')).rejects.toBeInstanceOf(SearchUnavailableError);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('formatSearchResults', () => {
    it('formats search results with citations', () => {
      const results = [
        { title: 'Test Title', url: 'https://example.com', content: 'Test content here', score: 0.9 },
      ];
      const formatted = formatSearchResults(results);
      expect(formatted).toContain('[1] Test Title');
      expect(formatted).toContain('URL: https://example.com');
      expect(formatted).toContain('Content: Test content here');
    });

    it('handles empty results', () => {
      const formatted = formatSearchResults([]);
      expect(formatted).toBe('No search results found.');
    });

    it('truncates long content', () => {
      const results = [
        { title: 'Long', url: 'https://example.com', content: 'a'.repeat(1000), score: 0.5 },
      ];
      const formatted = formatSearchResults(results);
      expect(formatted).toContain('...');
    });
  });
});
