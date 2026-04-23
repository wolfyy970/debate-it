/** Heartbeat interval for `GET /api/debates/:id/stream` (was inline in debates route). */
export const SSE_HEARTBEAT_MS = 15_000;

/** Max ReAct iterations per agent turn (`debate-agent.ts`). */
export const MAX_AGENT_ITERATIONS = 8;

/** Default Express listen port (`server/index.ts`). Uncommon default to reduce clashes with other local apps. */
export const DEFAULT_API_PORT = 38471;

/** Default Vite dev client port when `VITE_DEV_PORT` is unset (`vite.config.ts`, OpenRouter Referer fallback). */
export const DEFAULT_VITE_DEV_PORT = 52817;

/** JSON body size limit (`server/index.ts`). */
export const JSON_BODY_LIMIT = '10mb';

/** Reset when any SSE chunk arrives; if no chunk for this long, reader is cancelled (`chat-completion-sse.ts`). */
export const LLM_STREAM_IDLE_MS = 180_000;

/** Hard cap on wall-clock time for one streaming LLM request (`openrouter.ts`). */
export const LLM_STREAM_MAX_MS = 600_000;

/** Non-streaming `generateResponse` timeout (`openrouter.ts`). */
export const GENERATE_RESPONSE_TIMEOUT_MS = 120_000;

/** Tavily search request timeout (`search.ts`). */
export const TAVILY_FETCH_TIMEOUT_MS = 20_000;
