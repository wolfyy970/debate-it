export async function runReadUrl(args: Record<string, unknown>): Promise<string> {
  const url = args.url;
  if (!url || typeof url !== 'string') {
    throw new Error('Missing required parameter: url');
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Debater/1.0 (Research Assistant)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    const text = html
      .replace(/<script[^\u003e]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^\u003e]*>[\s\S]*?<\/style>/gi, '')
      .replace(/\u003c[^\u003e]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text.length > 8000 ? text.substring(0, 8000) + '...[truncated]' : text;
  } catch (error) {
    throw new Error(`Failed to read URL: ${error instanceof Error ? error.message : String(error)}`);
  }
}
