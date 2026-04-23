/** Join `base` (no trailing slash) and `path` (leading slash). Exported for unit tests. */
export function joinApiPath(base: string, path: string): string {
  const b = base.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return b ? `${b}${p}` : p;
}

/**
 * Base URL for REST + SSE when the API is not same-origin (configure `PORT` / `VITE_DEV_PORT` in `.env`; see `example.env`).
 * Set `VITE_API_URL` in `.env` (no trailing slash). Leave unset or empty for same-origin + dev proxy.
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (raw == null) return '';
  const trimmed = String(raw).trim();
  if (trimmed === '') return '';
  return trimmed.replace(/\/$/, '');
}

/** Absolute or same-origin path for `fetch` / `EventSource`. */
export function apiUrl(path: string): string {
  return joinApiPath(getApiBaseUrl(), path);
}
