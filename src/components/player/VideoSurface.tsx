/* The media element. Registers itself with the player store, forwards
   element events into the sync* handlers, manages HLS sources, resume
   position, throttled progress persistence, sidecar subtitle <track>
   elements, and the audio-only art backdrop. */
import { useEffect, useRef } from "react";
import { Music } from "lucide-react";
import { useLibraryStore } from "../../stores/useLibraryStore";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useSubtitleStore } from "./subtitleStore";
import { cn } from "../../lib/cn";
import type { MediaItem } from "../../types";

export function VideoSurface() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentId = usePlayerStore((s) => s.currentId);
  const item = useLibraryStore((s) => s.items.find((i) => i.id === currentId));

  // Fresh item for event handlers (registered once below).
  const itemRef = useRef<MediaItem | undefined>(item);
  itemRef.current = item;

  const tracks = useSubtitleStore((s) => s.tracks);
  const activeId = useSubtitleStore((s) => s.activeId);
  const subtitlesEnabled = useSettingsStore((s) => s.settings.subtitles.enabled);

  /* Register the element + listeners once per mount. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const ps = usePlayerStore.getState();
    ps.setVideoEl(video);

    let lastTouch = 0;
    const onPlay = () => {
      ps.syncPlay();
      const it = itemRef.current;
      if (it && video.currentTime < 1) {
        void useLibraryStore.getState().markStarted(it.id);
      }
    };
    const onTime = () => {
      ps.syncTime();
      // Persist progress at most every 15s; timeupdate fires ~4x/sec.
      const now = performance.now();
      const it = itemRef.current;
      if (it && now - lastTouch > 15000) {
        lastTouch = now;
        void useLibraryStore.getState().touchPlayed(it.id, video.currentTime);
      }
    };
    const onMeta = () => {
      ps.syncTime();
      const it = itemRef.current;
      const resume = useSettingsStore.getState().settings.general.resumePlayback;
      const pos = it?.position ?? 0;
      if (
        it &&
        resume &&
        pos > 5 &&
        Number.isFinite(video.duration) &&
        pos < video.duration - 10
      ) {
        video.currentTime = pos;
      }
    };
    const onVolume = () => ps.syncVolume();
    const onRate = () => ps.syncRate();
    const onPause = () => ps.syncPause();
    const onEnded = () => ps.syncEnded();

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("volumechange", onVolume);
    video.addEventListener("ratechange", onRate);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("volumechange", onVolume);
      video.removeEventListener("ratechange", onRate);
      video.removeEventListener("ended", onEnded);
      ps.setVideoEl(null);
    };
  }, []);

  /* Source (re)configuration per item: HLS for .m3u8, plain src otherwise.
     hls.js lazy-loads so the main bundle stays lean for local files. */
  useEffect(() => {
    const video = videoRef.current;
    const it = itemRef.current;
    if (!video || !it) return;
    let cancelled = false;
    let hls: { destroy: () => void } | null = null;
    if (it.src.toLowerCase().endsWith(".m3u8")) {
      void import("hls.js").then((m) => {
        if (cancelled) return;
        const Hls = m.default;
        if (Hls.isSupported()) {
          const inst = new Hls();
          hls = inst;
          inst.loadSource(it.src);
          inst.attachMedia(video);
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = it.src; // Safari native HLS
        }
      });
    } else {
      video.src = it.src;
    }
    video.playbackRate = usePlayerStore.getState().rate;
    void video.play().catch(() => undefined);
    return () => {
      cancelled = true;
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [currentId]);

  /* Push subtitle track modes onto the element after every change. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    useSubtitleStore.getState().applyTo(video, subtitlesEnabled);
  }, [tracks, activeId, subtitlesEnabled, currentId]);

  if (!item) return null;

  const externalTracks = tracks.filter((t) => !t.embedded);
  const isAudio = item.kind === "audio";

  return (
    <div className="relative h-full w-full">
      <video
        ref={videoRef}
        playsInline
        className={cn(isAudio ? "hidden" : "h-full w-full bg-black object-contain")}
      >
        {externalTracks.map((t) => (
          <track
            key={t.id}
            kind="subtitles"
            srcLang={t.lang ?? "en"}
            label={t.label}
            src={t.src}
          />
        ))}
      </video>

      {isAudio && (
        <>
          <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
            {item.thumbnail ? (
              <img
                src={item.thumbnail}
                alt=""
                className="h-full w-full scale-110 object-cover blur-2xl brightness-50"
              />
            ) : (
              <div className="h-full w-full bg-bg-surface-1" />
            )}
            <div className="absolute inset-0 bg-black/50" />
          </div>
          <div className="relative flex h-full flex-col items-center justify-center gap-5 p-8">
            <div className="flex h-48 w-48 items-center justify-center overflow-hidden rounded-container border border-border-subtle bg-bg-surface-1 shadow-pop">
              {item.thumbnail ? (
                <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
              ) : (
                <Music size={64} className="text-text-subtle" />
              )}
            </div>
            <div className="max-w-md text-center">
              <p className="truncate text-lg font-semibold text-text-main">{item.name}</p>
              <p className="mt-1 text-sm text-text-muted">Audio</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
