import { TAVILY_FETCH_TIMEOUT_MS } from './constants';

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export class SearchUnavailableError extends Error {
  constructor(message = 'Web search is not configured (TAVILY_API_KEY missing).') {
    super(message);
    this.name = 'SearchUnavailableError';
  }
}

export function hasTavilyKey(): boolean {
  return !!process.env.TAVILY_API_KEY;
}

export async function searchWeb(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY || '';
  if (!apiKey) {
    throw new SearchUnavailableError();
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(TAVILY_FETCH_TIMEOUT_MS),
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        search_depth: 'advanced',
        include_answer: false,
        include_images: false,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    return (data.results || []).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      content: r.content || '',
      score: r.score || 0,
    }));
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}

export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'No search results found.';
  }

  return results
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\nContent: ${r.content.substring(0, 500)}${r.content.length > 500 ? '...' : ''}`)
    .join('\n\n');
}
