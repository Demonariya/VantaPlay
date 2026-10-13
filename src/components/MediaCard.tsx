/* Shared media card: 16:9 thumbnail, duration badge, progress overlay,
   title + metadata. Click (or Enter) opens the player with the given queue. */
import type { KeyboardEvent, MouseEvent } from "react";
import { Clapperboard, Music } from "lucide-react";
import type { MediaItem } from "../types";
import { usePlayerStore } from "../stores/usePlayerStore";
import { useUIStore } from "../stores/useUIStore";
import { formatBytes, formatResolution, formatTime, progressFraction } from "../lib/format";
import { cn } from "../lib/cn";
import { Badge } from "./ui";

/** Shared click / keyboard / context-menu wiring for media surfaces. */
export function useMediaActions(item: MediaItem, queue: string[]) {
  const openPlayer = usePlayerStore((s) => s.openPlayer);
  const openContextMenu = useUIStore((s) => s.openContextMenu);
  const open = () => openPlayer(item.id, queue);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  };
  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    openContextMenu({ x: e.clientX, y: e.clientY, kind: "media", id: item.id });
  };
  return { open, onKeyDown, onContextMenu };
}

export function MediaThumbnail({ item, className }: { item: MediaItem; className?: string }) {
  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-card bg-bg-surface-1",
        className
      )}
    >
      {item.thumbnail ? (
        <img
          src={item.thumbnail}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
        />
      ) : item.kind === "audio" ? (
        <div className="flex h-full w-full items-center justify-center bg-bg-surface-2" aria-hidden="true">
          <Music size={32} className="text-text-subtle" />
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
          <Clapperboard size={28} className="text-text-subtle" />
        </div>
      )}
      {item.duration > 0 && (
        <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white">
          {formatTime(item.duration)}
        </span>
      )}
      {(() => {
        const p = progressFraction(item);
        return p != null ? (
          <span
            className="absolute bottom-0 left-0 h-[3px] bg-accent-primary"
            style={{ width: `${p * 100}%` }}
            aria-hidden="true"
          />
        ) : null;
      })()}
    </div>
  );
}

export function MediaCard({ item, queue }: { item: MediaItem; queue: string[] }) {
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
      className="group cursor-pointer rounded-card outline-none transition-shadow duration-200 ease-out focus-visible:ring-2 focus-visible:ring-accent-primary"
    >
      <MediaThumbnail item={item} />
      <div className="mt-2 px-0.5">
        <p className="line-clamp-2 text-sm leading-snug text-text-main" title={item.name}>
          {item.name}
        </p>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-text-subtle">
          <span className="tabular-nums">{formatBytes(item.size)}</span>
          {item.ext && <Badge>{item.ext}</Badge>}
          {resolution !== "—" && <span className="tabular-nums">{resolution}</span>}
        </div>
      </div>
    </div>
  );
}
