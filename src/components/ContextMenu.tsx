/* Right-click context menu for media, playlists, and streams. */

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  Copy,
  Info,
  ListMusic,
  ListPlus,
  Pencil,
  Play,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useLibraryStore } from "../stores/useLibraryStore";
import { usePlayerStore } from "../stores/usePlayerStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import { useUIStore } from "../stores/useUIStore";
import type { ContextMenuState } from "../types";
import { cn } from "../lib/cn";

function MenuRow({
  icon: Icon,
  label,
  danger,
  disabled,
  onClick,
  trailing,
}: {
  icon: LucideIcon;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm",
        "transition-all duration-200 ease-out",
        danger ? "text-danger" : "text-text-main",
        "hover:bg-bg-surface-2 disabled:pointer-events-none disabled:opacity-40"
      )}
    >
      <Icon
        size={16}
        aria-hidden="true"
        className={cn("shrink-0", !danger && "text-text-muted")}
      />
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {trailing}
    </button>
  );
}

export function ContextMenu() {
  const menu = useUIStore((s) => s.contextMenu);
  // Fresh mount on every open: confirm/picker state always starts clean.
  if (!menu) return null;
  return <MenuPanel menu={menu} />;
}

function MenuPanel({ menu }: { menu: ContextMenuState }) {
  const closeContextMenu = useUIStore((s) => s.closeContextMenu);
  const openModal = useUIStore((s) => s.openModal);
  const confirmOnDelete = useSettingsStore(
    (s) => s.settings.general.confirmOnDelete
  );
  const items = useLibraryStore((s) => s.items);
  const playlists = useLibraryStore((s) => s.playlists);
  const streams = useLibraryStore((s) => s.streams);

  const [confirming, setConfirming] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeContextMenu();
    };
    const onScroll = () => closeContextMenu();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [closeContextMenu]);

  const itemCount = menu.kind === "media" ? 5 : 3;
  const x = Math.min(menu.x, window.innerWidth - 232);
  const y = Math.max(
    8,
    Math.min(menu.y, window.innerHeight - (itemCount * 40 + 24))
  );

  const lib = useLibraryStore.getState();
  const player = usePlayerStore.getState();
  const close = () => closeContextMenu();

  const targetItem =
    menu.kind === "media" ? items.find((i) => i.id === menu.id) : undefined;
  const targetPlaylist =
    menu.kind === "playlist"
      ? playlists.find((p) => p.id === menu.id)
      : undefined;
  const targetStream =
    menu.kind === "stream" ? streams.find((s) => s.id === menu.id) : undefined;
  const streamItem = targetStream
    ? items.find((i) => i.streamUrl === targetStream.url)
    : undefined;

  const playMedia = (id: string) => {
    player.openPlayer(id);
    close();
  };

  const copyUrl = (url: string) => {
    try {
      const p = navigator.clipboard?.writeText(url);
      if (p && typeof p.catch === "function") p.catch(() => undefined);
    } catch {
      /* clipboard unavailable in this context */
    }
    close();
  };

  const runDelete = async () => {
    if (menu.kind === "media") await lib.removeItem(menu.id);
    else if (menu.kind === "playlist") await lib.deletePlaylist(menu.id);
    else await lib.removeStream(menu.id);
    close();
  };

  const onDeleteClick = () => {
    if (confirmOnDelete) setConfirming(true);
    else void runDelete();
  };

  const deleteTitle =
    menu.kind === "media"
      ? "Delete this item?"
      : menu.kind === "playlist"
        ? "Delete this playlist?"
        : "Remove this stream?";
  const deleteName =
    targetItem?.name ?? targetPlaylist?.name ?? targetStream?.name ?? "";
  const deleteVerb = menu.kind === "stream" ? "Remove" : "Delete";

  return (
    <div
      ref={panelRef}
      role="menu"
      aria-label="Context menu"
      style={{ left: x, top: y }}
      className={cn(
        "anim-pop-in fixed z-50 w-[220px] rounded-card border border-border-subtle",
        "bg-bg-surface-1 p-1.5 shadow-pop"
      )}
    >
      {confirming ? (
        <div className="px-2 py-1.5">
          <p className="px-1 text-sm font-medium text-text-main">{deleteTitle}</p>
          {deleteName && (
            <p className="mt-0.5 truncate px-1 text-xs text-text-subtle">
              {deleteName}
            </p>
          )}
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={cn(
                "flex-1 rounded-control border border-border-subtle px-3 py-1.5",
                "text-sm text-text-main transition-all duration-200 ease-out",
                "hover:bg-bg-surface-2"
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void runDelete()}
              className={cn(
                "flex-1 rounded-control bg-danger px-3 py-1.5 text-sm font-semibold",
                "text-text-main transition-all duration-200 ease-out",
                "hover:brightness-110 active:scale-95"
              )}
            >
              {deleteVerb}
            </button>
          </div>
        </div>
      ) : (
        <>
          {menu.kind === "media" && targetItem && (
            <>
              <MenuRow icon={Play} label="Play" onClick={() => playMedia(menu.id)} />
              <MenuRow
                icon={ListPlus}
                label="Add to Playlist"
                onClick={() => setPickerOpen((v) => !v)}
                trailing={
                  pickerOpen ? (
                    <ChevronDown size={14} aria-hidden="true" className="text-text-subtle" />
                  ) : (
                    <ChevronRight size={14} aria-hidden="true" className="text-text-subtle" />
                  )
                }
              />
              {pickerOpen && (
                <div className="mb-1 max-h-44 overflow-y-auto border-t border-border-subtle pt-1">
                  {playlists.length === 0 && (
                    <p className="px-3 py-2 text-xs text-text-subtle">
                      No playlists yet
                    </p>
                  )}
                  {playlists.map((p) => (
                    <MenuRow
                      key={p.id}
                      icon={ListMusic}
                      label={p.name}
                      onClick={() => {
                        void lib.addToPlaylist(p.id, menu.id);
                        close();
                      }}
                    />
                  ))}
                  <MenuRow
                    icon={Plus}
                    label="New playlist…"
                    onClick={() => openModal({ type: "newPlaylist", targetId: menu.id })}
                  />
                </div>
              )}
              <MenuRow
                icon={ArrowLeftRight}
                label="Convert / Stream"
                onClick={() => openModal({ type: "convert", targetId: menu.id })}
              />
              <MenuRow
                icon={Info}
                label="Properties"
                onClick={() => openModal({ type: "properties", targetId: menu.id })}
              />
              <MenuRow icon={Trash2} label="Delete" danger onClick={onDeleteClick} />
            </>
          )}

          {menu.kind === "playlist" && targetPlaylist && (
            <>
              <MenuRow
                icon={Play}
                label="Play"
                disabled={targetPlaylist.itemIds.length === 0}
                onClick={() => {
                  if (targetPlaylist.itemIds.length > 0) {
                    player.openPlayer(
                      targetPlaylist.itemIds[0],
                      targetPlaylist.itemIds
                    );
                    close();
                  }
                }}
              />
              <MenuRow
                icon={Pencil}
                label="Rename"
                onClick={() => openModal({ type: "renamePlaylist", targetId: menu.id })}
              />
              <MenuRow
                icon={Trash2}
                label="Delete playlist"
                danger
                onClick={onDeleteClick}
              />
            </>
          )}

          {menu.kind === "stream" && targetStream && (
            <>
              <MenuRow
                icon={Play}
                label="Play"
                disabled={!streamItem}
                onClick={() => {
                  if (streamItem) playMedia(streamItem.id);
                }}
              />
              <MenuRow
                icon={Copy}
                label="Copy URL"
                onClick={() => copyUrl(targetStream.url)}
              />
              <MenuRow icon={Trash2} label="Remove" danger onClick={onDeleteClick} />
            </>
          )}
        </>
      )}
    </div>
  );
}
