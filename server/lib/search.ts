import { TAVILY_FETCH_TIMEOUT_MS } from './constants';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export async function searchWeb(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  if (!TAVILY_API_KEY) {
    console.warn('TAVILY_API_KEY not set, search unavailable');
    // Return a special result that tells the LLM search is disabled
    return [{
      title: 'Search unavailable',
      url: '',
      content: 'Web search is not configured. Proceed with your argument using general knowledge.',
      score: 0,
    }];
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(TAVILY_FETCH_TIMEOUT_MS),
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
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
