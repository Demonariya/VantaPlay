/* Playback state for browser preview and native Windows libVLC playback. */
import { create } from "zustand";
import { readInitialVolume } from "./useSettingsStore";
import { invokeNative } from "../lib/nativeBridge";

interface NativeStatus { state: string; currentTimeMs: number; durationMs: number; volumePercent: number; muted: boolean; rate: number; }
interface PlayerState {
  videoEl: HTMLVideoElement | null; playerRoot: HTMLElement | null; currentId: string | null; queue: string[];
  isPlaying: boolean; currentTime: number; duration: number; bufferedEnd: number; volume: number; muted: boolean; rate: number;
  isFullscreen: boolean; playerOpen: boolean; nativeActive: boolean; nativeError: string | null;
  setVideoEl: (el: HTMLVideoElement | null) => void; setPlayerRoot: (el: HTMLElement | null) => void;
  setNativeActive: (active: boolean) => void; setNativeError: (error: string | null) => void;
  openPlayer: (id: string, queue?: string[]) => void; closePlayer: () => void; togglePlay: () => void;
  seekTo: (t: number) => void; seekBy: (delta: number) => void; setVolume: (v: number) => void; toggleMute: () => void; setRate: (r: number) => void;
  toggleFullscreen: () => void; next: () => void; prev: () => void; stepFrame: (dir: 1 | -1) => void;
  syncPlay: () => void; syncPause: () => void; syncTime: () => void; syncVolume: () => void; syncRate: () => void;
  syncEnded: () => void; syncNativeStatus: (status: NativeStatus) => void; syncFullscreen: (on: boolean) => void;
}
function clampTime(el: HTMLVideoElement, t: number): number {
  if (!Number.isFinite(el.duration) || el.duration <= 0) return Math.max(0, t);
  return Math.min(Math.max(0, t), el.duration);
}
function sendNative(command: string, args?: Record<string, unknown>): void {
  void invokeNative(command, args).catch((error: unknown) => usePlayerStore.setState({ nativeError: error instanceof Error ? error.message : String(error) }));
}
export const usePlayerStore = create<PlayerState>()((set, get) => ({
  videoEl: null, playerRoot: null, currentId: null, queue: [], isPlaying: false, currentTime: 0, duration: 0, bufferedEnd: 0,
  volume: readInitialVolume(), muted: false, rate: 1, isFullscreen: false, playerOpen: false, nativeActive: false, nativeError: null,
  setVideoEl: (el) => {
    if (get().videoEl === el) return;
    set({ videoEl: el });
    if (el) { el.volume = get().muted ? 0 : get().volume; el.playbackRate = get().rate; }
  },
  setPlayerRoot: (el) => set({ playerRoot: el }),
  setNativeActive: (active) => set({ nativeActive: active }),
  setNativeError: (error) => set({ nativeError: error }),
  openPlayer: (id, queue) => set({ currentId: id, queue: queue ?? [id], playerOpen: true, currentTime: 0, duration: 0, bufferedEnd: 0, nativeActive: false, nativeError: null }),
  closePlayer: () => {
    if (get().nativeActive) {
      sendNative("vlc_stop");
      sendNative("vlc_set_video_bounds", { bounds: { x: 0, y: 0, width: 0, height: 0 } });
    }
    get().videoEl?.pause();
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    set({ playerOpen: false, isPlaying: false, currentId: null, nativeActive: false });
  },
  togglePlay: () => {
    if (get().nativeActive) { sendNative(get().isPlaying ? "vlc_pause" : "vlc_play"); return; }
    const el = get().videoEl; if (!el) return;
    if (el.paused) void el.play().catch(() => undefined); else el.pause();
  },
  seekTo: (t) => {
    if (get().nativeActive) {
      const duration = get().duration; const target = Math.min(Math.max(0, t), duration > 0 ? duration : Number.MAX_SAFE_INTEGER);
      set({ currentTime: target }); sendNative("vlc_seek", { timeMs: Math.round(target * 1000) }); return;
    }
    const el = get().videoEl; if (!el) return; el.currentTime = clampTime(el, t); set({ currentTime: el.currentTime });
  },
  seekBy: (delta) => get().seekTo(get().currentTime + delta),
  stepFrame: (dir) => {
    if (get().nativeActive) { sendNative("vlc_pause"); get().seekTo(get().currentTime + dir / 30); return; }
    const el = get().videoEl; if (!el || !Number.isFinite(el.duration)) return; el.pause(); el.currentTime = clampTime(el, el.currentTime + dir / 30); set({ currentTime: el.currentTime });
  },
  setVolume: (v) => {
    const volume = Math.min(1, Math.max(0, v)); set({ volume, muted: volume === 0 ? true : get().muted });
    if (get().nativeActive) { sendNative("vlc_set_volume", { volumePercent: Math.round(volume * 100) }); if (volume === 0) sendNative("vlc_set_mute", { muted: true }); return; }
    const el = get().videoEl; if (el) { el.volume = volume; el.muted = volume === 0 ? true : el.muted; }
  },
  toggleMute: () => {
    const muted = !get().muted; set({ muted });
    if (get().nativeActive) { sendNative("vlc_set_mute", { muted }); return; }
    const el = get().videoEl; if (el) el.muted = muted;
  },
  setRate: (r) => {
    set({ rate: r }); if (get().nativeActive) { sendNative("vlc_set_rate", { rate: r }); return; }
    const el = get().videoEl; if (el) el.playbackRate = r;
  },
  toggleFullscreen: () => {
    const root = get().playerRoot; if (!root) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void root.requestFullscreen?.().catch(() => undefined);
  },
  next: () => { const { queue, currentId } = get(); const index = queue.indexOf(currentId ?? ""); if (index >= 0 && index < queue.length - 1) get().openPlayer(queue[index + 1], queue); },
  prev: () => {
    const { queue, currentId, currentTime, nativeActive } = get(); const el = get().videoEl;
    if ((nativeActive ? currentTime : (el?.currentTime ?? 0)) > 3) { get().seekTo(0); return; }
    const index = queue.indexOf(currentId ?? ""); if (index > 0) get().openPlayer(queue[index - 1], queue);
  },
  syncPlay: () => set({ isPlaying: true }), syncPause: () => set({ isPlaying: false }),
  syncTime: () => {
    const el = get().videoEl; if (!el) return; let bufferedEnd = 0;
    try { if (el.buffered.length > 0) bufferedEnd = el.buffered.end(el.buffered.length - 1); } catch { /* Some sources expose no ranges. */ }
    set({ currentTime: el.currentTime, duration: Number.isFinite(el.duration) ? el.duration : 0, bufferedEnd });
  },
  syncVolume: () => { const el = get().videoEl; if (el) set({ volume: el.volume, muted: el.muted }); },
  syncRate: () => { const el = get().videoEl; if (el) set({ rate: el.playbackRate }); },
  syncNativeStatus: (status) => set({
    isPlaying: status.state === "playing" || status.state === "buffering",
    currentTime: Math.max(0, status.currentTimeMs / 1000),
    duration: Math.max(0, status.durationMs / 1000),
    bufferedEnd: 0, volume: Math.min(1, Math.max(0, status.volumePercent / 100)), muted: status.muted, rate: status.rate || 1,
    nativeError: status.state === "error" ? "libVLC reported a playback error." : get().nativeError,
  }),
  syncEnded: () => { set({ isPlaying: false }); get().next(); },
  syncFullscreen: (on) => set({ isFullscreen: on }),
}));
