import type { Response } from 'express';
import type { ServerSseEvent } from './sse-events.js';

/** Write one SSE frame (OpenAI-style `data: …\\n\\n`). */
export function writeSseData(res: Response, event: ServerSseEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}
