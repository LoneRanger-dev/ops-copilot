'use client';

import { useState, type FormEvent } from 'react';
import { SendIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AssistantInputProps {
  onSubmit: (text: string) => void | Promise<void>;
  disabled?: boolean;
}

/**
 * Input row, wired to `/api/v1/assistant` via the parent panel's
 * `onSubmit` (MASTER_BUILD_SPEC.md §23.6 — KB-only, no tool calling).
 */
export function AssistantInput({ onSubmit, disabled }: AssistantInputProps) {
  const [value, setValue] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    setValue('');
    void onSubmit(trimmed);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border flex items-center gap-2 border-t p-3"
    >
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
        placeholder="Ask the knowledge base…"
        aria-label="Ask the knowledge base"
        className="flex-1"
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled || !value.trim()}
        aria-label="Send"
      >
        <SendIcon className="size-4" />
      </Button>
    </form>
  );
}
