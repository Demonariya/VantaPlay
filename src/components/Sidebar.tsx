/* Fixed left sidebar: brand, primary nav, collapse toggle. */

import {
  ChevronsLeft,
  ChevronsRight,
  Clapperboard,
  Home,
  ListMusic,
  Radio,
} from "lucide-react";
import { usePlayerStore } from "../stores/usePlayerStore";
import { useUIStore } from "../stores/useUIStore";
import type { AppView } from "../types";
import { cn } from "../lib/cn";
import { BrandMark } from "./BrandMark";

const NAV_ITEMS: { view: AppView; label: string; icon: typeof Home }[] = [
  { view: "home", label: "Home", icon: Home },
  { view: "library", label: "Library", icon: Clapperboard },
  { view: "playlists", label: "Playlists", icon: ListMusic },
  { view: "streams", label: "Streams", icon: Radio },
];

export function Sidebar() {
  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const closePlayer = usePlayerStore((s) => s.closePlayer);

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border-subtle bg-bg-primary",
        "transition-all duration-200 ease-out",
        collapsed ? "w-[72px]" : "w-60"
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center px-4",
          collapsed && "justify-center px-0"
        )}
      >
        <BrandMark collapsed={collapsed} />
      </div>

      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ view: itemView, label, icon: Icon }) => {
          const active = view === itemView;
          return (
            <button
              key={itemView}
              type="button"
              onClick={() => {
                setView(itemView);
                closePlayer();
              }}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              title={collapsed ? label : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-control px-3 py-2.5",
                "text-sm font-medium transition-all duration-200 ease-out",
                collapsed && "justify-center px-0",
                active
                  ? "bg-accent-soft text-text-main"
                  : "text-text-muted hover:bg-bg-surface-2 hover:text-text-main"
              )}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-accent-primary"
                />
              )}
              <Icon
                size={20}
                aria-hidden="true"
                className={cn("shrink-0", active && "text-accent-primary")}
              />
              {!collapsed && <span className="truncate">{label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-border-subtle p-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex h-10 w-full items-center justify-center rounded-control",
            "text-text-muted transition-all duration-200 ease-out",
            "hover:bg-bg-surface-2 hover:text-text-main"
          )}
        >
          {collapsed ? (
            <ChevronsRight size={20} aria-hidden="true" />
          ) : (
            <ChevronsLeft size={20} aria-hidden="true" />
          )}
        </button>
      </div>
    </aside>
  );
}
