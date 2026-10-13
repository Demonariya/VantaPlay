import { Play, Plus, Radio, Trash2 } from "lucide-react";
import { useLibraryStore } from "../stores/useLibraryStore";
import { usePlayerStore } from "../stores/usePlayerStore";
import { useUIStore } from "../stores/useUIStore";
import { formatRelative } from "../lib/format";
import { EmptyState, IconButton, SectionTitle } from "../components/ui";

function streamItemId(entryId: string): string {
  return `stream-${entryId}`;
}

export function StreamsView() {
  const streams = useLibraryStore((s) => s.streams);
  const removeStream = useLibraryStore((s) => s.removeStream);
  const openModal = useUIStore((s) => s.openModal);
  const openContextMenu = useUIStore((s) => s.openContextMenu);
  const openPlayer = usePlayerStore((s) => s.openPlayer);

  const playStream = (entryId: string) => {
    const id = streamItemId(entryId);
    openPlayer(id, [id]);
  };

  return (
    <div className="space-y-4">
      <SectionTitle
        action={
          <button
            type="button"
            onClick={() => openModal({ type: "addStream" })}
            aria-label="Open network stream"
            className="inline-flex items-center gap-2 rounded-control bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-200 ease-out hover:bg-accent-hover"
          >
            <Plus size={16} />
            Open stream
          </button>
        }
      >
        Streams
      </SectionTitle>

      {streams.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No saved streams"
          hint="Open a network stream to save it here for quick access later."
          action={
            <button
              type="button"
              onClick={() => openModal({ type: "addStream" })}
              className="inline-flex items-center gap-2 rounded-control bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-200 ease-out hover:bg-accent-hover"
            >
              <Plus size={16} />
              Open stream
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-1" role="list">
          {streams.map((entry) => (
            <div
              key={entry.id}
              role="listitem"
              onClick={() => playStream(entry.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") playStream(entry.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                openContextMenu({ x: e.clientX, y: e.clientY, kind: "stream", id: entry.id });
              }}
              tabIndex={0}
              aria-label={`Play stream ${entry.name}`}
              className="flex cursor-pointer items-center gap-3 rounded-control px-3 py-2.5 outline-none transition-colors duration-200 ease-out hover:bg-bg-surface-1 focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-bg-surface-2"
                aria-hidden="true"
              >
                <Radio size={18} className="text-text-muted" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-main">{entry.name}</p>
                <p className="truncate text-xs text-text-subtle">{entry.url}</p>
              </div>
              {entry.lastPlayedAt && (
                <span className="hidden shrink-0 text-xs text-text-subtle sm:block">
                  {formatRelative(entry.lastPlayedAt)}
                </span>
              )}
              <span onClick={(e) => e.stopPropagation()}>
                <IconButton
                  icon={Play}
                  label={`Play ${entry.name}`}
                  onClick={() => playStream(entry.id)}
                />
              </span>
              <span onClick={(e) => e.stopPropagation()}>
                <IconButton
                  icon={Trash2}
                  label={`Delete ${entry.name}`}
                  onClick={() => void removeStream(entry.id)}
                />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
