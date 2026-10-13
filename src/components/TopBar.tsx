/* Sticky top bar: view title, unified search, quick actions. */

import { LayoutGrid, List, Plus, Radio, Search } from "lucide-react";
import { useLibraryStore } from "../stores/useLibraryStore";
import { useUIStore } from "../stores/useUIStore";
import { cn } from "../lib/cn";
import { pickMediaFiles } from "../lib/import";
import { IconButton } from "./ui";

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function TopBar() {
  const view = useUIStore((s) => s.view);
  const query = useUIStore((s) => s.searchQuery);
  const setQuery = useUIStore((s) => s.setSearchQuery);
  const setPaletteOpen = useUIStore((s) => s.setPaletteOpen);
  const openModal = useUIStore((s) => s.openModal);
  const viewMode = useUIStore((s) => s.libraryViewMode);
  const setViewMode = useUIStore((s) => s.setLibraryViewMode);
  const itemCount = useLibraryStore((s) => s.items.length);
  const playlistCount = useLibraryStore((s) => s.playlists.length);
  const streamCount = useLibraryStore((s) => s.streams.length);

  const { title, subtitle } = (() => {
    switch (view) {
      case "library":
        return { title: "Library", subtitle: plural(itemCount, "item", "items") };
      case "playlists":
        return { title: "Playlists", subtitle: plural(playlistCount, "playlist", "playlists") };
      case "streams":
        return { title: "Streams", subtitle: `${streamCount} saved` };
      case "player":
        return { title: "Now Playing", subtitle: undefined as string | undefined };
      case "home":
      default:
        return { title: "Home", subtitle: "Your media at a glance" };
    }
  })();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border-subtle bg-bg-primary/80 px-5 backdrop-blur">
      <div className="w-44 min-w-0 shrink-0">
        <h1 className="truncate text-base font-semibold text-text-main">{title}</h1>
        {subtitle && (
          <p className="truncate text-xs text-text-subtle">{subtitle}</p>
        )}
      </div>

      <div className="flex min-w-0 flex-1 justify-center">
        <div className="relative w-full max-w-xl">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-subtle"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search media, streams, or settings..."
            aria-label="Search media, streams, or settings"
            className={cn(
              "h-10 w-full rounded-control border border-border-subtle bg-bg-surface-1",
              "pl-10 pr-14 text-sm text-text-main placeholder:text-text-subtle",
              "transition-all duration-200 ease-out hover:border-border-strong",
              "focus:border-accent-primary focus:outline-none"
            )}
          />
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Open command palette"
            title="Open command palette (Ctrl+K)"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md transition-colors duration-200 hover:bg-bg-surface-2"
          >
            <kbd className="flex h-6 items-center rounded-md border border-border-subtle bg-bg-surface-2 px-1.5 text-[11px] font-medium text-text-muted">
              ⌘K
            </kbd>
          </button>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={pickMediaFiles}
          aria-label="Add media files"
          title="Add media files"
          className={cn(
            "flex h-10 items-center gap-1.5 rounded-control bg-accent-primary px-3.5",
            "text-sm font-semibold text-text-main transition-all duration-200 ease-out",
            "hover:bg-accent-hover active:scale-95"
          )}
        >
          <Plus size={16} aria-hidden="true" />
          Add
        </button>
        <IconButton
          icon={Radio}
          label="Open network stream"
          onClick={() => openModal({ type: "addStream" })}
        />
        <div
          role="group"
          aria-label="Library view mode"
          className="flex rounded-control border border-border-subtle bg-bg-surface-1 p-1"
        >
          <button
            type="button"
            aria-label="Grid view"
            aria-pressed={viewMode === "grid"}
            onClick={() => setViewMode("grid")}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md transition-all duration-200 ease-out",
              viewMode === "grid"
                ? "bg-bg-surface-2 text-text-main"
                : "text-text-muted hover:text-text-main"
            )}
          >
            <LayoutGrid size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="List view"
            aria-pressed={viewMode === "list"}
            onClick={() => setViewMode("list")}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md transition-all duration-200 ease-out",
              viewMode === "list"
                ? "bg-bg-surface-2 text-text-main"
                : "text-text-muted hover:text-text-main"
            )}
          >
            <List size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
