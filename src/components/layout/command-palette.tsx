'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  BarChart3Icon,
  BookOpenIcon,
  LaptopIcon,
  LayoutDashboardIcon,
  MessageSquareIcon,
  MoonIcon,
  SearchIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SunIcon,
  TicketIcon,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { navigation } from '@/config/site';
import { hasRoleAtLeast } from '@/lib/auth/rbac';
import type { UserRole } from '@/config/constants';
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut';
import { useUiStore } from '@/stores/ui.store';
import { toRoute } from '@/lib/utils/routes';

const NAV_ICONS = {
  LayoutDashboard: LayoutDashboardIcon,
  MessageSquare: MessageSquareIcon,
  Ticket: TicketIcon,
  BookOpen: BookOpenIcon,
  BarChart3: BarChart3Icon,
  Settings: SettingsIcon,
  ShieldCheck: ShieldCheckIcon,
} as const;

/** Global ⌘K command palette (§23.3 frontend task 6). */
export function CommandPalette({ role }: { role: UserRole }) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const open = useUiStore((state) => state.commandPaletteOpen);
  const setOpen = useUiStore((state) => state.setCommandPaletteOpen);

  useKeyboardShortcut('k', () => setOpen(!open), { meta: true });

  const runCommand = React.useCallback(
    (action: () => void) => {
      setOpen(false);
      action();
    },
    [setOpen],
  );

  const visibleItems = navigation.filter((item) => hasRoleAtLeast(role, item.minRole));

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command palette"
      description="Jump to a page or change a setting"
    >
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {visibleItems.map((item) => {
            const Icon = NAV_ICONS[item.icon];
            return (
              <CommandItem
                key={item.href}
                value={item.label}
                onSelect={() => runCommand(() => router.push(toRoute(item.href)))}
              >
                <Icon />
                {item.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Theme">
          <CommandItem
            value="Light theme"
            onSelect={() => runCommand(() => setTheme('light'))}
          >
            <SunIcon />
            Light
          </CommandItem>
          <CommandItem
            value="Dark theme"
            onSelect={() => runCommand(() => setTheme('dark'))}
          >
            <MoonIcon />
            Dark
          </CommandItem>
          <CommandItem
            value="System theme"
            onSelect={() => runCommand(() => setTheme('system'))}
          >
            <LaptopIcon />
            System
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Search">
          <CommandItem disabled value="Knowledge base search">
            <SearchIcon />
            Knowledge base search — arrives in Phase 5
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
