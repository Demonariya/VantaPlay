/* Media list that renders a grid of cards or compact rows,
   following the ui library view-mode preference. */
import type { MediaItem } from "../types";
import { useUIStore } from "../stores/useUIStore";
import { formatBytes, formatResolution, formatTime } from "../lib/format";
import { MediaCard, useMediaActions } from "./MediaCard";
import { Badge } from "./ui";

function MediaRow({ item, queue }: { item: MediaItem; queue: string[] }) {
  const { open, onKeyDown, onContextMenu } = useMediaActions(item, queue);
  const resolution = formatResolution(item.width, item.height);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Play ${item.name}`}
      onClick={open}
      onKeyDown={onKeyDown}
      onContextMenu={onContextMenu}
      className="flex cursor-pointer items-center gap-4 rounded-control px-3 py-2 outline-none transition-colors duration-200 ease-out hover:bg-bg-surface-1 focus-visible:ring-2 focus-visible:ring-accent-primary"
    >
      <div className="w-40 shrink-0">
        <div className="relative aspect-video w-full overflow-hidden rounded-card bg-bg-surface-1">
          {item.thumbnail ? (
            <img
              src={item.thumbnail}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-bg-surface-2" aria-hidden="true">
              <span className="text-[10px] font-medium uppercase tracking-wide text-text-subtle">
                {item.kind}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-text-main" title={item.name}>
          {item.name}
        </p>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-text-subtle">
          <span className="tabular-nums">{formatBytes(item.size)}</span>
          {item.ext && <Badge>{item.ext}</Badge>}
          {resolution !== "—" && <span className="tabular-nums">{resolution}</span>}
        </div>
      </div>
      {item.duration > 0 && (
        <span className="ml-auto shrink-0 text-xs tabular-nums text-text-muted">
          {formatTime(item.duration)}
        </span>
      )}
    </div>
  );
}

export function MediaList({ items }: { items: MediaItem[] }) {
  const viewMode = useUIStore((s) => s.libraryViewMode);
  const queue = items.map((i) => i.id);

  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-1" role="list">
        {items.map((item) => (
          <MediaRow key={item.id} item={item} queue={queue} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" role="list">
      {items.map((item) => (
        <MediaCard key={item.id} item={item} queue={queue} />
      ))}
    </div>
  );
}
