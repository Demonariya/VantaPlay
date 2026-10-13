/* Full-screen player view: top title bar, the video surface, and the
   floating playbar. Controls auto-hide after 3s of inactivity while
   playing (kept visible when paused or when the pointer is over the
   playbar), with keyboard shortcuts for transport. */
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { IconButton } from "../components/ui";
import { useLibraryStore } from "../stores/useLibraryStore";
import { usePlayerStore } from "../stores/usePlayerStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import { useUIStore } from "../stores/useUIStore";
import { formatTime } from "../lib/format";
import { cn } from "../lib/cn";
import { VideoSurface } from "../components/player/VideoSurface";
import { Playbar } from "../components/player/Playbar";
import { useSubtitleStore } from "../components/player/subtitleStore";

const HIDE_DELAY_MS = 3000;

function isEditableTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !("tagName" in el)) return false;
  const tag = (el.tagName ?? "").toUpperCase();
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    tag === "BUTTON" ||
    !!el.isContentEditable
  );
}

export function PlayerView() {
  const playerOpen = usePlayerStore((s) => s.playerOpen);
  const currentId = usePlayerStore((s) => s.currentId);
  const item = useLibraryStore((s) => s.items.find((i) => i.id === currentId));
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const closePlayer = usePlayerStore((s) => s.closePlayer);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const seekBy = usePlayerStore((s) => s.seekBy);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const toggleFullscreen = usePlayerStore((s) => s.toggleFullscreen);
  const setPlayerRoot = usePlayerStore((s) => s.setPlayerRoot);
  const syncFullscreen = usePlayerStore((s) => s.syncFullscreen);
  const skip = useSettingsStore((s) => s.settings.advanced.skipIntervalSec);

  const rootRef = useRef<HTMLDivElement>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hoveringPlaybar = useRef(false);
  const hideTimer = useRef<number | null>(null);

  /* Root registration, fullscreen tracking, subtitle cleanup on unmount. */
  useEffect(() => {
    setPlayerRoot(rootRef.current);
    const onFs = () => syncFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      setPlayerRoot(null);
      useSubtitleStore.getState().clear();
    };
  }, [setPlayerRoot, syncFullscreen]);

  /* Auto-hide: show on activity, hide after 3s while playing. */
  const poke = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (usePlayerStore.getState().isPlaying && !hoveringPlaybar.current) {
        setControlsVisible(false);
      }
    }, HIDE_DELAY_MS);
  }, []);

  useEffect(() => {
    poke();
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [poke, isPlaying]);

  const onHoverChange = useCallback(
    (hovering: boolean) => {
      hoveringPlaybar.current = hovering;
      if (!hovering) poke();
    },
    [poke]
  );

  /* Transport shortcuts. Space is left to native button activation when a
     button has focus (avoids double toggles). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      poke();
      if (isEditableTarget(e.target)) return;
      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekBy(-(e.shiftKey ? skip : 5));
          break;
        case "ArrowRight":
          e.preventDefault();
          seekBy(e.shiftKey ? skip : 5);
          break;
        case "KeyM":
          toggleMute();
          break;
        case "KeyF":
          toggleFullscreen();
          break;
        case "Escape":
          // Popovers handle their own Escape; only leave the player when none is open.
          if (useUIStore.getState().popoverOpen) return;
          closePlayer();
          break;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [poke, togglePlay, seekBy, skip, toggleMute, toggleFullscreen, closePlayer]);

  if (!playerOpen || !item) return null;

  const hidden = !controlsVisible;

  return (
    <div
      ref={rootRef}
      onMouseMove={poke}
      onKeyDown={poke}
      className={cn(
        "anim-fade-in fixed inset-0 z-40 flex flex-col bg-black",
        hidden && "cursor-none"
      )}
    >
      {/* Top bar */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 z-10 flex items-center gap-3",
          "bg-gradient-to-b from-black/70 to-transparent p-4",
          "transition-all duration-200 ease-out",
          hidden && "pointer-events-none -translate-y-2 opacity-0"
        )}
      >
        <IconButton
          icon={ArrowLeft}
          label="Back to library"
          onClick={closePlayer}
          className="text-text-main hover:bg-white/10"
        />
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-text-main">{item.name}</h1>
          <p className="text-xs text-text-muted">
            {item.kind === "audio" ? "Audio" : "Video"}
            {item.duration > 0 ? ` · ${formatTime(item.duration)}` : " · Live"}
          </p>
        </div>
      </div>

      {/* Media surface */}
      <div className="relative min-h-0 flex-1">
        <VideoSurface />
      </div>

      <Playbar onHoverChange={onHoverChange} hidden={hidden} />
    </div>
  );
}
