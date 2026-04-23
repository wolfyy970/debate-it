/** Join `base` (no trailing slash) and `path` (leading slash). Exported for unit tests. */
export function joinApiPath(base: string, path: string): string {
  const b = base.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return b ? `${b}${p}` : p;
}

/**
 * Base URL for REST + SSE when the API is not same-origin (e.g. API on :3001, Vite on :5173).
 * Set `VITE_API_URL` in `.env` (no trailing slash). Leave unset or empty for same-origin + dev proxy.
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (raw == null || raw === '') return '';
  return String(raw).replace(/\/$/, '');
}

/** Absolute or same-origin path for `fetch` / `EventSource`. */
export function apiUrl(path: string): string {
  return joinApiPath(getApiBaseUrl(), path);
}
