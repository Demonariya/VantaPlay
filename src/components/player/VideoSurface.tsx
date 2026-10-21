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
import { invokeNative, isTauriRuntime } from "../../lib/nativeBridge";

export function VideoSurface() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const currentId = usePlayerStore((s) => s.currentId);
  const item = useLibraryStore((s) => s.items.find((i) => i.id === currentId));
  const nativeError = usePlayerStore((s) => s.nativeError);
  const nativeMode = isTauriRuntime() && !!item && (!!item.nativePath || !!item.isStream);

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
  }, [nativeMode]);

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


  useEffect(() => {
    const mediaId = currentId;
    if (!nativeMode || !item || !mediaId) {
      usePlayerStore.getState().setNativeActive(false);
      if (isTauriRuntime()) {
        void invokeNative("vlc_stop").catch(() => undefined);
        void invokeNative("vlc_set_video_bounds", { bounds: { x: 0, y: 0, width: 0, height: 0 } }).catch(() => undefined);
      }
      return;
    }
    let cancelled = false;
    let timer: number | null = null;
    let handledEnded = false;
    let markedStarted = false;
    let lastTouch = 0;
    const resume = useSettingsStore.getState().settings.general.resumePlayback;
    const startTimeMs = resume ? Math.max(0, Math.round((item.position ?? 0) * 1000)) : 0;
    const source = item.nativePath ?? item.streamUrl ?? item.src;
    usePlayerStore.getState().setNativeActive(true);
    usePlayerStore.getState().setNativeError(null);

    const poll = async () => {
      try {
        const status = await invokeNative<{ state: string; currentTimeMs: number; durationMs: number; volumePercent: number; muted: boolean; rate: number }>("vlc_status");
        if (cancelled) return;
        usePlayerStore.getState().syncNativeStatus(status);
        if (!markedStarted && (status.state === "playing" || status.state === "buffering")) {
          markedStarted = true;
          void useLibraryStore.getState().markStarted(mediaId);
        }
        const it = useLibraryStore.getState().items.find((entry) => entry.id === mediaId);
        if (it && status.durationMs > 0 && it.duration === 0) {
          void useLibraryStore.getState().updateItem(mediaId, { duration: status.durationMs / 1000 });
        }
        if (status.currentTimeMs > 0 && performance.now() - lastTouch > 15000) {
          lastTouch = performance.now();
          void useLibraryStore.getState().touchPlayed(mediaId, status.currentTimeMs / 1000);
        }
        if (status.state === "ended" && !handledEnded) { handledEnded = true; usePlayerStore.getState().syncEnded(); }
      } catch (error) {
        if (!cancelled) usePlayerStore.getState().setNativeError(error instanceof Error ? error.message : String(error));
      }
    };

    void invokeNative("vlc_open", { source, startTimeMs }).then(() => {
      if (cancelled) return;
      void poll();
      timer = window.setInterval(() => void poll(), 500);
    }).catch((error: unknown) => {
      if (!cancelled) usePlayerStore.getState().setNativeError(error instanceof Error ? error.message : String(error));
    });
    return () => { cancelled = true; if (timer !== null) window.clearInterval(timer); };
  }, [nativeMode, currentId]);

  useEffect(() => {
    if (!nativeMode || !item) return;
    const element = surfaceRef.current;
    if (!element) return;
    const updateBounds = () => {
      const rect = element.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      const topInset = 72;
      const bottomInset = 148;
      const bounds = item.kind === "audio"
        ? { x: 0, y: 0, width: 0, height: 0 }
        : {
            x: Math.round(rect.left * scale),
            y: Math.round((rect.top + topInset) * scale),
            width: Math.max(0, Math.round(rect.width * scale)),
            height: Math.max(0, Math.round((rect.height - topInset - bottomInset) * scale)),
          };
      void invokeNative("vlc_set_video_bounds", { bounds }).catch((error: unknown) => {
        usePlayerStore.getState().setNativeError(error instanceof Error ? error.message : String(error));
      });
    };
    const observer = new ResizeObserver(updateBounds);
    observer.observe(element);
    window.addEventListener("resize", updateBounds);
    updateBounds();
    return () => { observer.disconnect(); window.removeEventListener("resize", updateBounds); };
  }, [nativeMode, currentId]);


  /* Push subtitle track modes onto the browser media element after every change. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    useSubtitleStore.getState().applyTo(video, subtitlesEnabled);
  }, [tracks, activeId, subtitlesEnabled, currentId]);

  if (!item) return null;

  const externalTracks = tracks.filter((t) => !t.embedded);
  const isAudio = item.kind === "audio";

  if (nativeMode) {
    return (
      <div ref={surfaceRef} className="relative h-full w-full bg-black">
        {isAudio && (
          <>
            <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
              {item.thumbnail ? <img src={item.thumbnail} alt="" className="h-full w-full scale-110 object-cover blur-2xl brightness-50" /> : <div className="h-full w-full bg-bg-surface-1" />}
              <div className="absolute inset-0 bg-black/50" />
            </div>
            <div className="relative flex h-full flex-col items-center justify-center gap-5 p-8">
              <div className="flex h-48 w-48 items-center justify-center overflow-hidden rounded-container border border-border-subtle bg-bg-surface-1 shadow-pop">
                {item.thumbnail ? <img src={item.thumbnail} alt="" className="h-full w-full object-cover" /> : <Music size={64} className="text-text-subtle" />}
              </div>
              <div className="max-w-md text-center"><p className="truncate text-lg font-semibold text-text-main">{item.name}</p><p className="mt-1 text-sm text-text-muted">Audio</p></div>
            </div>
          </>
        )}
        {nativeError && <div role="alert" className="absolute inset-x-6 top-20 z-50 mx-auto max-w-2xl rounded-lg border border-red-400/30 bg-black/95 p-4 text-sm text-red-100 shadow-xl"><p className="font-semibold">Native playback could not start</p><p className="mt-1 break-words text-red-100/80">{nativeError}</p></div>}
      </div>
    );
  }

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
