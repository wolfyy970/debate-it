import { describe, it, expect } from 'vitest';
import {
  reasoningTextFromDelta,
  streamEventsFromOpenAiSseResponse,
} from '../../server/lib/chat-completion-sse';

async function collectStream(gen: AsyncGenerator<{ type: string; data?: string }>) {
  const out: { type: string; data?: string }[] = [];
  for await (const ev of gen) {
    out.push(ev);
  }
  return out;
}

describe('reasoningTextFromDelta', () => {
  it('extracts OpenRouter reasoning_details text and summary', () => {
    const delta = {
      reasoning_details: [
        { type: 'reasoning.summary', summary: 'Plan: verify then answer.' },
        { type: 'reasoning.text', text: 'Step one…' },
      ],
    };
    expect(reasoningTextFromDelta(delta)).toBe('Plan: verify then answer.Step one…');
  });

  it('falls back to reasoning_content and thinking', () => {
    expect(
      reasoningTextFromDelta({ reasoning_content: 'A', thinking: 'B', reasoning: 'C' }),
    ).toBe('ABC');
  });

  it('extracts text from unknown reasoning_details types when a text field is present', () => {
    expect(
      reasoningTextFromDelta({
        reasoning_details: [{ type: 'vendor.chunk', text: 'Opaque step' }],
      }),
    ).toBe('Opaque step');
  });

  it('uses content on reasoning_details when type is unknown', () => {
    expect(
      reasoningTextFromDelta({
        reasoning_details: [{ type: 'other', content: 'Body' }],
      }),
    ).toBe('Body');
  });
});

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

  it('yields reasoning for delta.reasoning_details (OpenRouter)', async () => {
    const encoder = new TextEncoder();
    const chunk = {
      choices: [
        {
          delta: {
            reasoning_details: [{ type: 'reasoning.text', text: 'Thinking aloud…' }],
          },
        },
      ],
    };
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        controller.close();
      },
    });
    const response = new Response(stream);
    const events = await collectStream(streamEventsFromOpenAiSseResponse(response));
    expect(events).toContainEqual({ type: 'reasoning', data: 'Thinking aloud…' });
  });

  it('throws idle timeout when no bytes arrive within idleMs', async () => {
    const stream = new ReadableStream({
      start() {
        /* never enqueue — reader blocks until idle timer cancels it */
      },
    });
    const response = new Response(stream);
    const gen = streamEventsFromOpenAiSseResponse(response, { idleMs: 80 });
    await expect(
      (async () => {
        for await (const _ of gen) {
          /* drain */
        }
      })(),
    ).rejects.toThrow(/stalled|idle timeout/i);
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
