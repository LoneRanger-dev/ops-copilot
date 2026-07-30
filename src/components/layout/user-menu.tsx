'use client';

import Link from 'next/link';
import { LogOutIcon, SettingsIcon, ShieldCheckIcon, UserIcon } from 'lucide-react';
import { signOutAction } from '@/lib/auth/actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { UserRole } from '@/config/constants';

interface UserMenuProps {
  email: string;
  fullName: string | null;
  role: UserRole;
}

function initials(fullName: string | null, email: string): string {
  const source = fullName?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

const ROLE_LABEL: Record<UserRole, string> = {
  end_user: 'End user',
  support_engineer: 'Support engineer',
  manager: 'Manager',
  admin: 'Administrator',
};

/** Account menu in the topbar (§23.3 frontend task 5). */
export function UserMenu({ email, fullName, role }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-2">
          <Avatar className="size-6">
            <AvatarFallback className="text-[10px]">
              {initials(fullName, email)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">
            {fullName ?? email}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
          <span className="text-foreground truncate text-sm font-medium">
            {fullName ?? email}
          </span>
          <span className="text-muted-foreground truncate text-xs">{email}</span>
          <span className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
            <ShieldCheckIcon className="size-3" />
            {ROLE_LABEL[role]}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <UserIcon />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/appearance">
            <SettingsIcon />
            Appearance
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOutAction} className="contents">
          <DropdownMenuItem asChild variant="destructive">
            <button type="submit" className="w-full">
              <LogOutIcon />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
