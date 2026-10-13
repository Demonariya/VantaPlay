/* Command palette (Cmd/Ctrl+K): fuzzy-ish search over media, streams,
   playlists, plus quick actions. */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  Clapperboard,
  ListMusic,
  Music,
  PanelLeft,
  Plus,
  Radio,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useLibraryStore } from "../stores/useLibraryStore";
import { usePlayerStore } from "../stores/usePlayerStore";
import { useUIStore } from "../stores/useUIStore";
import { cn } from "../lib/cn";
import { pickMediaFiles } from "../lib/import";
import { searchItems } from "../lib/selectors";

interface PaletteRow {
  key: string;
  icon: LucideIcon;
  label: string;
  hint: string;
  run: () => void;
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="mr-1 rounded border border-border-subtle bg-bg-surface-2 px-1.5 py-0.5 font-sans text-[10px] text-text-muted">
      {children}
    </kbd>
  );
}

export function CommandPalette() {
  const open = useUIStore((s) => s.paletteOpen);
  // Fresh mount on every open: query and selection always start clean.
  if (!open) return null;
  return <PalettePanel />;
}

function PalettePanel() {
  const setPaletteOpen = useUIStore((s) => s.setPaletteOpen);
  const openModal = useUIStore((s) => s.openModal);
  const setView = useUIStore((s) => s.setView);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const items = useLibraryStore((s) => s.items);
  const playlists = useLibraryStore((s) => s.playlists);
  const streams = useLibraryStore((s) => s.streams);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const rows = useMemo<PaletteRow[]>(() => {
    const q = query.trim().toLowerCase();
    const close = () => setPaletteOpen(false);
    const list: PaletteRow[] = [];

    const mediaHits = searchItems(items, query).slice(0, 8);
    const mediaIds = mediaHits.map((m) => m.id);
    for (const m of mediaHits) {
      list.push({
        key: `media-${m.id}`,
        icon: m.isStream ? Radio : m.kind === "audio" ? Music : Clapperboard,
        label: m.name,
        hint: m.isStream ? "Stream" : m.kind === "audio" ? "Audio" : "Video",
        run: () => {
          usePlayerStore.getState().openPlayer(m.id, mediaIds);
          close();
        },
      });
    }

    const streamHits = streams
      .filter(
        (s) =>
          !q ||
          s.name.toLowerCase().includes(q) ||
          s.url.toLowerCase().includes(q)
      )
      .slice(0, 5);
    for (const s of streamHits) {
      const itemId = items.find((i) => i.streamUrl === s.url)?.id;
      if (!itemId) continue;
      list.push({
        key: `stream-${s.id}`,
        icon: Radio,
        label: s.name,
        hint: "Stream",
        run: () => {
          usePlayerStore.getState().openPlayer(itemId);
          close();
        },
      });
    }

    const playlistHits = playlists
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .slice(0, 5);
    for (const p of playlistHits) {
      list.push({
        key: `playlist-${p.id}`,
        icon: ListMusic,
        label: p.name,
        hint: "Playlist",
        run: () => {
          setView("playlists");
          close();
        },
      });
    }

    const actions: PaletteRow[] = [
      {
        key: "action-settings",
        icon: Settings,
        label: "Open Settings",
        hint: "Action",
        run: () => openModal({ type: "settings" }),
      },
      {
        key: "action-sidebar",
        icon: PanelLeft,
        label: "Toggle sidebar",
        hint: "Action",
        run: () => {
          toggleSidebar();
          close();
        },
      },
      {
        key: "action-add",
        icon: Plus,
        label: "Add files",
        hint: "Action",
        run: () => {
          pickMediaFiles();
          close();
        },
      },
      {
        key: "action-stream",
        icon: Radio,
        label: "Open network stream",
        hint: "Action",
        run: () => openModal({ type: "addStream" }),
      },
    ];
    for (const a of actions) {
      if (!q || a.label.toLowerCase().includes(q)) list.push(a);
    }
    return list;
  }, [query, items, playlists, streams, setPaletteOpen, openModal, setView, toggleSidebar]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>("[data-active='true']")
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onQueryChange = (value: string) => {
    setQuery(value);
    setActiveIndex(0);
  };

  const active = rows.length > 0 ? Math.min(activeIndex, rows.length - 1) : 0;

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (rows.length ? (i + 1) % rows.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (rows.length ? (i - 1 + rows.length) % rows.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      rows[active]?.run();
    } else if (e.key === "Escape") {
      setPaletteOpen(false);
    }
  };

  return (
    <div
      className="anim-fade-in fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setPaletteOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-label="Command palette"
        className="anim-pop-in w-full max-w-xl overflow-hidden rounded-container border border-border-subtle bg-bg-surface-1 shadow-pop"
      >
        <div className="flex items-center gap-3 border-b border-border-subtle px-4">
          <Search size={18} aria-hidden="true" className="shrink-0 text-text-subtle" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a command or search..."
            aria-label="Command palette"
            className="h-12 w-full bg-transparent text-sm text-text-main placeholder:text-text-subtle focus:outline-none"
          />
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto p-1.5">
          {rows.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-text-subtle">
              {query.trim()
                ? `No results for "${query.trim()}"`
                : "Start typing to search"}
            </p>
          ) : (
            rows.map((row, i) => {
              const Icon = row.icon;
              const isActive = i === active;
              return (
                <button
                  key={row.key}
                  type="button"
                  data-active={isActive}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => row.run()}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-control px-3 py-2 text-left",
                    "transition-colors duration-200",
                    isActive ? "bg-bg-surface-2" : "bg-transparent"
                  )}
                >
                  <Icon size={16} aria-hidden="true" className="shrink-0 text-text-muted" />
                  <span className="min-w-0 flex-1 truncate text-sm text-text-main">
                    {row.label}
                  </span>
                  <span className="shrink-0 text-xs text-text-subtle">{row.hint}</span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-center gap-5 border-t border-border-subtle px-4 py-2.5 text-xs text-text-subtle">
          <span>
            <Kbd>↑↓</Kbd>navigate
          </span>
          <span>
            <Kbd>↵</Kbd>select
          </span>
          <span>
            <Kbd>esc</Kbd>close
          </span>
        </div>
      </div>
    </div>
  );
}
