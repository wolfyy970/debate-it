import { describe, expect, it, vi } from 'vitest';
import { writeSseData } from '../../server/lib/sse-writer.js';

describe('writeSseData', () => {
  it('writes a single SSE frame with trailing newlines', () => {
    const write = vi.fn();
    const res = { write } as unknown as import('express').Response;

    writeSseData(res, { type: 'ping' });

    expect(write).toHaveBeenCalledTimes(1);
    const frame = write.mock.calls[0][0] as string;
    expect(frame).toBe('data: {"type":"ping"}\n\n');
  });
});
