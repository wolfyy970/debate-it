import { describe, it, expect } from 'vitest';
import { missingKeysErrorPath, parseMissingKeys } from '../lib/apiErrors';

describe('apiErrors', () => {
  it('builds the missing-keys URL with flags only for what is missing', () => {
    expect(missingKeysErrorPath({ llm: true, tavily: true })).toBe(
      '/error?reason=missing-keys&llm=1&tavily=1',
    );
    expect(missingKeysErrorPath({ tavily: true })).toBe(
      '/error?reason=missing-keys&tavily=1',
    );
    expect(missingKeysErrorPath({})).toBe('/error?reason=missing-keys');
  });

  it('parses the `missing` object from a 503 response body', async () => {
    const res = new Response(
      JSON.stringify({ error: 'Service Unavailable', missing: { llm: false, tavily: true } }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
    expect(await parseMissingKeys(res)).toEqual({ llm: false, tavily: true });
  });

  it('returns an empty object when the body is not JSON', async () => {
    const res = new Response('nope', { status: 503 });
    expect(await parseMissingKeys(res)).toEqual({});
  });
});
