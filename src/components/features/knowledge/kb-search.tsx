'use client';

import { SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface KbSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Text search across titles/content (MASTER_BUILD_SPEC.md §23.5 frontend task 4). */
export function KbSearch({ value, onChange, placeholder }: KbSearchProps) {
  return (
    <div className="relative max-w-md">
      <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? 'Search the knowledge base…'}
        className="pl-9"
        aria-label="Search knowledge base"
      />
    </div>
  );
}
