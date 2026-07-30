import OpenAI from 'openai';
import { env } from '@/config/env';

/**
 * Thin OpenAI client singleton. Full agent orchestration (planner, router,
 * validator — MASTER_BUILD_SPEC.md §9-10) is out of scope for this demo
 * build; both `/api/v1/chat` and `/api/v1/assistant` call this directly with
 * a single grounded system prompt rather than a multi-agent pipeline.
 */
let client: OpenAI | undefined;

export function getOpenAiClient(): OpenAI {
  client ??= new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: env.OPENAI_TIMEOUT_MS });
  return client;
}

/**
 * Streams a chat completion as plain UTF-8 text chunks. The client reads
 * `response.body` directly (`src/hooks/use-chat-stream.ts`) rather than
 * Server-Sent Events, which keeps both ends of this demo-scope stream to a
 * few lines each.
 */
export function streamChatCompletion(
  messages: readonly OpenAI.Chat.ChatCompletionMessageParam[],
  options: { model: string; temperature?: number; maxTokens?: number },
): ReadableStream<Uint8Array> {
  const openai = getOpenAiClient();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await openai.chat.completions.create({
          model: options.model,
          messages: [...messages],
          temperature: options.temperature ?? 0.3,
          max_tokens: options.maxTokens ?? 900,
          stream: true,
        });

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) controller.enqueue(encoder.encode(delta));
        }
        controller.close();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error contacting OpenAI.';
        controller.enqueue(encoder.encode(`\n\n_Error: ${message}_`));
        controller.close();
      }
    },
  });
}
