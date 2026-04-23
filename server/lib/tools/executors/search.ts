import { searchWeb } from '../../search';
import type { Source } from '../../store';

export async function runSearchWeb(
  args: Record<string, unknown>,
  streamSignal?: AbortSignal,
): Promise<{
  content: string;
  sources: Source[];
}> {
  const query = args.query;
  if (!query || typeof query !== 'string') {
    throw new Error('Missing required parameter: query');
  }

  const results = await searchWeb(query, 5, streamSignal);

  if (results.length === 0) {
    return {
      content:
        'No search results found. You may need to try a different query or proceed with general knowledge.',
      sources: [],
    };
  }

  const sources: Source[] = results.map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content.substring(0, 200),
  }));

  const content = results
    .map(
      (r, i) =>
        `Result ${i + 1}:\nTitle: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`,
    )
    .join('\n\n');

  return { content, sources };
}
