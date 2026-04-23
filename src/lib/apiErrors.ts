/**
 * Client helpers for interpreting API error bodies.
 *
 * The server returns 503 with `{ missing: { llm, tavily } }` when required
 * capabilities are not configured. This module centralizes the URL that the
 * UI uses to route the user to the configuration error page.
 */

export interface MissingKeys {
  llm?: boolean;
  tavily?: boolean;
}

export function missingKeysErrorPath(missing: MissingKeys): string {
  const params = new URLSearchParams({ reason: 'missing-keys' });
  if (missing.llm) params.set('llm', '1');
  if (missing.tavily) params.set('tavily', '1');
  return `/error?${params.toString()}`;
}

/** Parse a JSON body returned by `sendMissingKeysError` on the server. */
export async function parseMissingKeys(response: Response): Promise<MissingKeys> {
  try {
    const body = (await response.clone().json()) as { missing?: MissingKeys };
    return body.missing ?? {};
  } catch {
    return {};
  }
}
