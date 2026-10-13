/* Floating glassmorphic control dock. Row 1: scrubber. Row 2: transport
   controls (play/pause with morphing icon, skip 10s, time), spacer, then
   volume, subtitle/audio tracks, speed, fullscreen. Prev/next appear when
   the queue has more than one item. */
import { Pause, Play, RotateCcw, RotateCw, SkipBack, SkipForward, Maximize, Minimize } from "lucide-react";
import { IconButton } from "../ui";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { formatTime } from "../../lib/format";
import { cn } from "../../lib/cn";
import { Scrubber } from "./Scrubber";
import { VolumeControl } from "./VolumeControl";
import { TrackMenu } from "./TrackMenu";
import { SpeedMenu } from "./SpeedMenu";

interface PlaybarProps {
  onHoverChange?: (hovering: boolean) => void;
  /** Auto-hide state from PlayerView (transitions on this root). */
  hidden?: boolean;
}

export function Playbar({ onHoverChange, hidden }: PlaybarProps) {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const isFullscreen = usePlayerStore((s) => s.isFullscreen);
  const queue = usePlayerStore((s) => s.queue);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const seekBy = usePlayerStore((s) => s.seekBy);
  const toggleFullscreen = usePlayerStore((s) => s.toggleFullscreen);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const skip = useSettingsStore((s) => s.settings.advanced.skipIntervalSec);

  const live = !Number.isFinite(duration) || duration <= 0;

  return (
    <div
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      className={cn(
        "glass anim-slide-up absolute bottom-6 left-1/2 w-[min(880px,calc(100%-3rem))] -translate-x-1/2",
        "rounded-container px-4 py-3 shadow-pop",
        "transition-all duration-200 ease-out",
        hidden && "pointer-events-none translate-y-4 opacity-0"
      )}
    >
      <div className="mb-1">
        <Scrubber />
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className={cn(
            "relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
            "bg-text-main text-black transition-all duration-200 ease-out",
            "hover:bg-accent-primary hover:text-white active:scale-95"
          )}
        >
          <Play
            size={22}
            fill="currentColor"
            className={cn(
              "absolute transition-all duration-200 ease-out",
              isPlaying ? "scale-50 opacity-0" : "scale-100 opacity-100"
            )}
          />
          <Pause
            size={22}
            fill="currentColor"
            className={cn(
              "absolute transition-all duration-200 ease-out",
              isPlaying ? "scale-100 opacity-100" : "scale-50 opacity-0"
            )}
          />
        </button>

        {queue.length > 1 && (
          <IconButton icon={SkipBack} label="Previous track" size="sm" onClick={prev} />
        )}
        <IconButton
          icon={RotateCcw}
          label={`Back ${skip} seconds`}
          size="sm"
          onClick={() => seekBy(-skip)}
        />
        <IconButton
          icon={RotateCw}
          label={`Forward ${skip} seconds`}
          size="sm"
          onClick={() => seekBy(skip)}
        />
        {queue.length > 1 && (
          <IconButton icon={SkipForward} label="Next track" size="sm" onClick={next} />
        )}

        <div
          role="timer"
          aria-label={live ? `${formatTime(currentTime)} of live stream` : `${formatTime(currentTime)} of ${formatTime(duration)}`}
          className="ml-2 shrink-0 text-xs tabular-nums text-text-muted"
        >
          {formatTime(currentTime)}
          <span className="text-text-subtle"> / </span>
          {live ? "Live" : formatTime(duration)}
        </div>

        <div className="flex-1" />

        <VolumeControl />
        <TrackMenu />
        <SpeedMenu />
        <IconButton
          icon={isFullscreen ? Minimize : Maximize}
          label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          onClick={toggleFullscreen}
        />
      </div>
    </div>
  );
}
