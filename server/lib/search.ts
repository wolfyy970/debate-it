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

export class SearchTimeoutError extends Error {
  constructor(message = 'Search request timed out.') {
    super(message);
    this.name = 'SearchTimeoutError';
  }
}

export class SearchHttpError extends Error {
  readonly status: number;

  constructor(status: number, detail?: string) {
    super(
      detail?.trim()
        ? `Tavily API error: ${status} — ${detail.trim()}`
        : `Tavily API error: ${status}`,
    );
    this.name = 'SearchHttpError';
    this.status = status;
  }
}

export function hasTavilyKey(): boolean {
  return !!process.env.TAVILY_API_KEY;
}

function composeTavilySignal(streamSignal?: AbortSignal): AbortSignal {
  const wall = AbortSignal.timeout(TAVILY_FETCH_TIMEOUT_MS);
  return streamSignal != null ? AbortSignal.any([wall, streamSignal]) : wall;
}

/**
 * @param streamSignal Optional job cancel — combined with per-request Tavily timeout.
 */
export async function searchWeb(
  query: string,
  maxResults: number = 5,
  streamSignal?: AbortSignal,
): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY || '';
  if (!apiKey) {
    throw new SearchUnavailableError();
  }

  const signal = composeTavilySignal(streamSignal);

  let response: Response;
  try {
    response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
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
  } catch (e: unknown) {
    const name =
      typeof e === 'object' && e !== null && 'name' in e && typeof (e as { name: unknown }).name === 'string'
        ? (e as { name: string }).name
        : '';
    if (name === 'TimeoutError' || name === 'AbortError') {
      throw new SearchTimeoutError();
    }
    throw e;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new SearchHttpError(response.status, errorText);
  }

  const data = (await response.json()) as { results?: unknown[] };

  return (data.results || []).map((raw) => {
    const r = raw as Record<string, unknown>;
    return {
      title: typeof r.title === 'string' ? r.title : '',
      url: typeof r.url === 'string' ? r.url : '',
      content: typeof r.content === 'string' ? r.content : '',
      score: typeof r.score === 'number' ? r.score : 0,
    };
  });
}

export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'No search results found.';
  }

  return results
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\nContent: ${r.content.substring(0, 500)}${r.content.length > 500 ? '...' : ''}`)
    .join('\n\n');
}
