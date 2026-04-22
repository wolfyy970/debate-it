import { describe, it, expect } from 'vitest';
import { streamEventsFromOpenAiSseResponse } from '../../server/lib/chat-completion-sse';

async function collectStream(gen: AsyncGenerator<{ type: string; data?: string }>) {
  const out: { type: string; data?: string }[] = [];
  for await (const ev of gen) {
    out.push(ev);
  }
  return out;
}

describe('streamEventsFromOpenAiSseResponse', () => {
  it('yields text_delta for content delta', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode('data: {"choices":[{"delta":{"content":"hello"}}]}\n\n')
        );
        controller.close();
      },
    });
    const response = new Response(stream);
    const events = await collectStream(streamEventsFromOpenAiSseResponse(response));
    expect(events).toContainEqual({ type: 'text_delta', data: 'hello' });
  });

  it('yields done with stopReason when finish_reason present', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n'
          )
        );
        controller.close();
      },
    });
    const response = new Response(stream);
    const events = await collectStream(streamEventsFromOpenAiSseResponse(response));
    expect(events.some((e) => e.type === 'done')).toBe(true);
    expect(events.find((e) => e.type === 'done')).toMatchObject({ type: 'done', stopReason: 'stop' });
  });
});
