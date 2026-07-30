'use client';

import { useState } from 'react';
import { MenuIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { siteConfig } from '@/config/site';
import type { UserRole } from '@/config/constants';
import { Sidebar } from './sidebar';

/** Slide-over navigation below the `lg` breakpoint (§23.3 acceptance criteria). */
export function MobileNav({ role }: { role: UserRole }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation"
        >
          <MenuIcon className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-border border-b">
          <SheetTitle>{siteConfig.name}</SheetTitle>
        </SheetHeader>
        <div className="h-[calc(100%-4.5rem)]">
          <Sidebar role={role} onNavigate={() => setOpen(false)} variant="mobile" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
