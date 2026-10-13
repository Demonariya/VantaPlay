import { useEffect, useState } from "react";
import { ListMusic, Plus } from "lucide-react";
import { useLibraryStore } from "../stores/useLibraryStore";
import { useUIStore } from "../stores/useUIStore";
import { MediaList } from "../components/MediaList";
import { EmptyState, SectionTitle } from "../components/ui";
import { cn } from "../lib/cn";

export function PlaylistsView() {
  const playlists = useLibraryStore((s) => s.playlists);
  const items = useLibraryStore((s) => s.items);
  const openModal = useUIStore((s) => s.openModal);
  const openContextMenu = useUIStore((s) => s.openContextMenu);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = playlists.find((p) => p.id === selectedId) ?? playlists[0] ?? null;

  useEffect(() => {
    if (selectedId && !playlists.some((p) => p.id === selectedId)) {
      setSelectedId(playlists[0]?.id ?? null);
    }
  }, [playlists, selectedId]);

  const selectedItems = selected
    ? selected.itemIds
        .map((id) => items.find((i) => i.id === id))
        .filter((i): i is (typeof items)[number] => Boolean(i))
    : [];

  return (
    <div className="space-y-4">
      <SectionTitle
        action={
          <button
            type="button"
            onClick={() => openModal({ type: "newPlaylist" })}
            aria-label="Create new playlist"
            className="inline-flex items-center gap-2 rounded-control bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-200 ease-out hover:bg-accent-hover"
          >
            <Plus size={16} />
            New playlist
          </button>
        }
      >
        Playlists
      </SectionTitle>

      {playlists.length === 0 ? (
        <EmptyState
          icon={ListMusic}
          title="No playlists yet"
          hint="Create a playlist to group videos and songs into collections."
          action={
            <button
              type="button"
              onClick={() => openModal({ type: "newPlaylist" })}
              className="inline-flex items-center gap-2 rounded-control bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-200 ease-out hover:bg-accent-hover"
            >
              <Plus size={16} />
              New playlist
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-6 md:flex-row">
          <nav aria-label="Playlists" className="w-full shrink-0 space-y-1 md:w-56">
            {playlists.map((p) => {
              const active = p.id === selected?.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openContextMenu({ x: e.clientX, y: e.clientY, kind: "playlist", id: p.id });
                  }}
                  aria-label={`Playlist ${p.name}, ${p.itemIds.length} items`}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "relative flex w-full items-center justify-between gap-2 rounded-control px-4 py-2.5 text-left text-sm",
                    "transition-colors duration-200 ease-out outline-none",
                    "focus-visible:ring-2 focus-visible:ring-accent-primary",
                    active
                      ? "bg-bg-surface-2 text-text-main"
                      : "text-text-muted hover:bg-bg-surface-1 hover:text-text-main"
                  )}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-accent-primary"
                      aria-hidden="true"
                    />
                  )}
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-text-subtle">
                    {p.itemIds.length}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="min-w-0 flex-1">
            {selected && (
              <p className="mb-3 text-sm text-text-muted" aria-live="polite">
                {selectedItems.length} {selectedItems.length === 1 ? "item" : "items"} in{" "}
                <span className="text-text-main">{selected.name}</span>
              </p>
            )}
            {selectedItems.length === 0 ? (
              <EmptyState
                icon={ListMusic}
                title="This playlist is empty"
                hint="Right-click any media item and choose Add to Playlist to fill it up."
              />
            ) : (
              <MediaList items={selectedItems} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
