"use client";

import { useState } from "react";
import { Search, Bell, ChevronRight } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { CommandPalette } from "@/components/shell/command-palette";
import { NotificationsDrawer } from "@/components/shell/notifications-drawer";

interface TopbarProps {
  breadcrumb?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}

export function Topbar({ breadcrumb, actions }: TopbarProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <>
      <header className="h-14 px-6 flex items-center justify-between gap-6 border-b border-line bg-canvas/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2 text-[13px] min-w-0">
          {breadcrumb?.map((b, i) => (
            <div key={i} className="flex items-center gap-2 min-w-0">
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-2 select-none shrink-0" />}
              <span
                className={
                  i === breadcrumb.length - 1
                    ? "text-ink font-semibold truncate"
                    : "text-muted hover:text-ink-2 cursor-pointer truncate"
                }
              >
                {b.label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 h-9 pl-3 pr-1.5 rounded-full bg-white border border-line hover:border-line-strong transition-colors"
          >
            <Search className="h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
            <span className="text-[12.5px] text-muted-2 mr-10">
              Rechercher devis, client…
            </span>
            <Kbd>⌘K</Kbd>
          </button>

          {actions}

          <button
            aria-label="Notifications"
            onClick={() => setNotifOpen(true)}
            className="relative h-9 w-9 rounded-full hover:bg-canvas-2 inline-flex items-center justify-center transition-colors"
          >
            <Bell className="h-4 w-4 text-ink-2" strokeWidth={2.2} />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-pink ring-2 ring-canvas animate-pulse-soft" />
          </button>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <NotificationsDrawer open={notifOpen} onOpenChange={setNotifOpen} />
    </>
  );
}
