/* Custom seek slider: 6px bar growing to 10px on hover, buffered and
   played fills, hover knob, keyboard support, and a hover thumbnail
   tooltip captured from the media (cached, capped). Live streams
   (duration 0) render an indeterminate shimmer with seeking disabled. */
import { useCallback, useEffect, useRef, useState } from "react";
import { useLibraryStore } from "../../stores/useLibraryStore";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { captureFrame } from "../../lib/media";
import { formatTime } from "../../lib/format";
import { cn } from "../../lib/cn";

/** Process-wide thumbnail cache: `${itemId}:${second}` -> jpeg data URL. */
const THUMB_CACHE = new Map<string, string>();
const THUMB_CACHE_MAX = 40;
const THUMB_DEBOUNCE_MS = 120;

interface Tip {
  x: number;
  t: number;
  img?: string;
}

export function Scrubber() {
  const currentId = usePlayerStore((s) => s.currentId);
  const item = useLibraryStore((s) => s.items.find((i) => i.id === currentId));
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const bufferedEnd = usePlayerStore((s) => s.bufferedEnd);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const seekBy = usePlayerStore((s) => s.seekBy);
  const skipInterval = useSettingsStore((s) => s.settings.advanced.skipIntervalSec);

  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const thumbTimer = useRef<number | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  const live = !Number.isFinite(duration) || duration <= 0;

  const timeFromClientX = useCallback(
    (clientX: number): number => {
      const el = trackRef.current;
      if (!el || live) return 0;
      const r = el.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      return frac * duration;
    },
    [duration, live]
  );

  const scheduleThumb = useCallback(
    (t: number) => {
      if (!item || item.kind === "audio") return;
      const key = `${item.id}:${Math.round(t)}`;
      const cached = THUMB_CACHE.get(key);
      if (cached) {
        setTip((prev) => (prev ? { ...prev, img: cached } : prev));
        return;
      }
      if (thumbTimer.current) window.clearTimeout(thumbTimer.current);
      const src = item.src;
      thumbTimer.current = window.setTimeout(() => {
        void captureFrame(src, t, 240).then((img) => {
          if (!img) return;
          THUMB_CACHE.set(key, img);
          if (THUMB_CACHE.size > THUMB_CACHE_MAX) {
            const oldest = THUMB_CACHE.keys().next().value;
            if (oldest !== undefined) THUMB_CACHE.delete(oldest);
          }
          setTip((prev) => (prev && Math.abs(prev.t - t) < 1 ? { ...prev, img } : prev));
        });
      }, THUMB_DEBOUNCE_MS);
    },
    [item]
  );

  useEffect(
    () => () => {
      if (thumbTimer.current) window.clearTimeout(thumbTimer.current);
    },
    []
  );

  const hideTip = () => {
    if (thumbTimer.current) window.clearTimeout(thumbTimer.current);
    setTip(null);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (live) return;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekTo(timeFromClientX(e.clientX));
    hideTip();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (live) return;
    if (draggingRef.current) {
      seekTo(timeFromClientX(e.clientX));
      return;
    }
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const t = timeFromClientX(e.clientX);
    const x = Math.min(Math.max(76, e.clientX - r.left), Math.max(76, r.width - 76));
    setTip((prev) => ({ x, t, img: prev && Math.abs(prev.t - t) < 1 ? prev.img : undefined }));
    scheduleThumb(t);
  };
  const endDrag = () => {
    draggingRef.current = false;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (live) return;
    const step = e.shiftKey ? skipInterval : 5;
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        seekBy(-step);
        break;
      case "ArrowRight":
        e.preventDefault();
        seekBy(step);
        break;
      case "Home":
        e.preventDefault();
        seekTo(0);
        break;
      case "End":
        e.preventDefault();
        seekTo(duration);
        break;
    }
  };

  const playedPct = live ? 0 : Math.min(100, (currentTime / duration) * 100);
  const bufferedPct = live ? 0 : Math.min(100, (bufferedEnd / duration) * 100);

  return (
    <div className="relative">
      {tip && !live && (
        <div
          className="pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2"
          style={{ left: tip.x }}
          aria-hidden="true"
        >
          <div className="rounded-card border border-border-subtle bg-bg-surface-1 p-1.5 shadow-pop">
            {tip.img ? (
              <img src={tip.img} alt="" className="aspect-video w-40 rounded object-cover" />
            ) : (
              <div className="skeleton aspect-video w-40 rounded" />
            )}
            <p className="mt-1 text-center text-[11px] tabular-nums text-text-muted">
              {formatTime(tip.t)}
            </p>
          </div>
        </div>
      )}

      <div
        ref={trackRef}
        role="slider"
        tabIndex={live ? -1 : 0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={
          live ? "Live stream" : `${formatTime(currentTime)} of ${formatTime(duration)}`
        }
        aria-disabled={live}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => {
          endDrag();
          hideTip();
        }}
        onKeyDown={onKeyDown}
        className={cn(
          "group relative flex h-6 w-full items-center outline-none",
          live ? "cursor-default" : "cursor-pointer"
        )}
      >
        <div
          className={cn(
            "relative h-[6px] w-full overflow-visible rounded-pill bg-bg-surface-2",
            "transition-all duration-200 ease-out",
            !live && "group-hover:h-[10px]"
          )}
        >
          {!live && (
            <div
              className="absolute inset-y-0 left-0 rounded-pill bg-accent-faint"
              style={{ width: `${bufferedPct}%` }}
            />
          )}
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-pill",
              live ? "skeleton w-full" : "bg-accent-primary"
            )}
            style={live ? undefined : { width: `${playedPct}%` }}
          />
          {!live && (
            <div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-text-main opacity-0 shadow transition-opacity duration-200 ease-out group-hover:opacity-100"
              style={{ left: `${playedPct}%` }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
