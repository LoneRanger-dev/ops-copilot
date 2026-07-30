'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Reads a plain-text streaming `Response` body chunk by chunk, calling
 * `onDelta` as bytes arrive. Both `/api/v1/chat` and `/api/v1/assistant`
 * stream raw UTF-8 text (see `src/lib/ai/llm/openai.ts`), so one small hook
 * covers both the full chat page and the floating widget.
 */
export function useChatStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (
      url: string,
      body: unknown,
      onDelta: (chunk: string) => void,
      onDone?: () => void,
    ) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.body) {
          onDelta('No response body received.');
          return;
        }

        if (!response.ok) {
          const text = await response.text();
          onDelta(`Request failed (${response.status}): ${text.slice(0, 200)}`);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          onDelta(decoder.decode(value, { stream: true }));
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          onDelta(`\n\n_Connection error: ${(error as Error).message}_`);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        onDone?.();
      }
    },
    [],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  return { send, stop, isStreaming };
}
