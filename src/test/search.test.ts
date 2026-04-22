import { describe, it, expect } from 'vitest';
import { searchWeb, formatSearchResults } from '../../server/lib/search';

describe('search', () => {
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
