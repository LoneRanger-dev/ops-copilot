'use client';

import { useRef, useState } from 'react';
import { SendIcon, SquareIcon, BotIcon, UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { cn } from '@/lib/utils/cn';
import { useChatStream } from '@/hooks/use-chat-stream';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'What does error code E-4471 mean?',
  "What's the status of INC0010271?",
  'How do I fix repeated VPN disconnects?',
  'Walk me through the disk-space-critical runbook.',
];

/**
 * Main AI Chat (MASTER_BUILD_SPEC.md §3.2, FR-CHAT). Full tools, ServiceNow
 * reads, and citations — the counterpart to the KB-only floating widget.
 * Single-thread for this demo build; persisted multi-conversation history
 * (FR-CHAT-5/6) is the full Phase 7 scope this stands in for.
 */
export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const { send, stop, isStreaming } = useChatStream();
  const assistantIdRef = useRef<string | null>(null);

  function appendDelta(delta: string) {
    const id = assistantIdRef.current;
    if (!id) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content: m.content + delta } : m)),
    );
  }

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    };
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
    };
    assistantIdRef.current = assistantMsg.id;

    const history = [...messages, userMsg];
    setMessages([...history, assistantMsg]);
    setInput('');

    await send(
      '/api/v1/chat',
      { messages: history.map(({ role, content }) => ({ role, content })) },
      appendDelta,
    );
    assistantIdRef.current = null;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <PageHeader
        title="AI Chat"
        description="Full diagnostic assistant — knowledge base search plus live ServiceNow incident lookups."
      />

      <ScrollArea className="flex-1 px-1">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
          {messages.length === 0 ? (
            <EmptyState
              icon={BotIcon}
              title="Ask anything about an incident, error, or runbook"
              description="This surface can search the knowledge base and read live ServiceNow tickets — try mentioning a ticket number like INC0010271."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <Button key={s} variant="outline" size="sm" onClick={() => submit(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
              }
            />
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' && 'flex-row-reverse',
                )}
              >
                <div
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted',
                  )}
                >
                  {message.role === 'user' ? (
                    <UserIcon className="size-4" />
                  ) : (
                    <BotIcon className="size-4" />
                  )}
                </div>
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg border px-4 py-2.5 text-sm whitespace-pre-wrap',
                    message.role === 'user'
                      ? 'border-primary/20 bg-primary/10'
                      : 'border-border bg-card',
                  )}
                >
                  {message.content || (isStreaming ? '…' : '')}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit(input);
        }}
        className="border-border mx-auto flex w-full max-w-3xl items-end gap-2 border-t p-4"
      >
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void submit(input);
            }
          }}
          placeholder="Ask about an incident, error code, or troubleshooting step…"
          rows={2}
          className="flex-1 resize-none"
        />
        {isStreaming ? (
          <Button type="button" variant="outline" onClick={stop}>
            <SquareIcon className="size-4" /> Stop
          </Button>
        ) : (
          <Button type="submit" disabled={!input.trim()}>
            <SendIcon className="size-4" /> Send
          </Button>
        )}
      </form>
    </div>
  );
}
