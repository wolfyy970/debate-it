/** Heartbeat interval for `GET /api/debates/:id/stream` (was inline in debates route). */
export const SSE_HEARTBEAT_MS = 15_000;

/** Max ReAct iterations per agent turn (`debate-agent.ts`). */
export const MAX_AGENT_ITERATIONS = 5;

/** Default Express listen port (`server/index.ts`). */
export const DEFAULT_API_PORT = 3001;

/** JSON body size limit (`server/index.ts`). */
export const JSON_BODY_LIMIT = '10mb';

/** Per-LLM streaming request timeout, composed with user cancel signal (`openrouter.ts`). */
export const LLM_STREAM_TIMEOUT_MS = 30_000;

/** Non-streaming `generateResponse` timeout (`openrouter.ts`). */
export const GENERATE_RESPONSE_TIMEOUT_MS = 120_000;

/** Tavily search request timeout (`search.ts`). */
export const TAVILY_FETCH_TIMEOUT_MS = 10_000;
