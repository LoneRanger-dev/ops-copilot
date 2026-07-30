'use client';

import { SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UserRole } from '@/config/constants';
import { useUiStore } from '@/stores/ui.store';
import { Breadcrumbs } from './breadcrumbs';
import { MobileNav } from './mobile-nav';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

interface TopbarProps {
  role: UserRole;
  email: string;
  fullName: string | null;
}

/** Sticky top bar: mobile nav trigger, breadcrumbs, search, theme, account (§23.3 frontend task 5). */
export function Topbar({ role, email, fullName }: TopbarProps) {
  const setCommandPaletteOpen = useUiStore((state) => state.setCommandPaletteOpen);

  return (
    <header className="border-border bg-background/80 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b px-4 backdrop-blur">
      <MobileNav role={role} />
      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-muted-foreground hidden gap-2 sm:flex"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <SearchIcon className="size-4" />
          <span>Search</span>
          <kbd className="bg-muted text-muted-foreground ml-2 rounded border px-1.5 py-0.5 text-[10px] font-medium">
            ⌘K
          </kbd>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="sm:hidden"
          aria-label="Search"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <SearchIcon className="size-4" />
        </Button>
        <ThemeToggle />
        <UserMenu email={email} fullName={fullName} role={role} />
      </div>
    </header>
  );
}
