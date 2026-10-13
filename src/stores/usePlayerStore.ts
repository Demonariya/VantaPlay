/* Playback state. The <video> element lives in the Player view
   (VideoSurface) and registers itself here; every control in the app
   drives playback through these actions. Element events flow back
   through the sync* handlers so the store is always the source of
   truth for UI. */
import { create } from "zustand";
import { readInitialVolume } from "./useSettingsStore";

interface PlayerState {
  videoEl: HTMLVideoElement | null;
  playerRoot: HTMLElement | null;
  currentId: string | null;
  queue: string[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  bufferedEnd: number;
  volume: number; // 0..1
  muted: boolean;
  rate: number;
  isFullscreen: boolean;
  playerOpen: boolean;

  setVideoEl: (el: HTMLVideoElement | null) => void;
  setPlayerRoot: (el: HTMLElement | null) => void;
  openPlayer: (id: string, queue?: string[]) => void;
  closePlayer: () => void;
  togglePlay: () => void;
  seekTo: (t: number) => void;
  seekBy: (delta: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setRate: (r: number) => void;
  toggleFullscreen: () => void;
  next: () => void;
  prev: () => void;
  stepFrame: (dir: 1 | -1) => void;

  // Called by VideoSurface from element events:
  syncPlay: () => void;
  syncPause: () => void;
  syncTime: () => void;
  syncVolume: () => void;
  syncRate: () => void;
  syncEnded: () => void;
  syncFullscreen: (on: boolean) => void;
}

function clampTime(el: HTMLVideoElement, t: number): number {
  if (!Number.isFinite(el.duration) || el.duration <= 0) return Math.max(0, t);
  return Math.min(Math.max(0, t), el.duration);
}

export const usePlayerStore = create<PlayerState>()((set, get) => ({
  videoEl: null,
  playerRoot: null,
  currentId: null,
  queue: [],
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  bufferedEnd: 0,
  volume: readInitialVolume(),
  muted: false,
  rate: 1,
  isFullscreen: false,
  playerOpen: false,

  setVideoEl: (el) => {
    const prev = get().videoEl;
    if (prev === el) return;
    set({ videoEl: el });
    if (el) {
      el.volume = get().muted ? 0 : get().volume;
      el.playbackRate = get().rate;
    }
  },
  setPlayerRoot: (el) => set({ playerRoot: el }),

  openPlayer: (id, queue) => {
    set({
      currentId: id,
      queue: queue ?? [id],
      playerOpen: true,
      currentTime: 0,
      duration: 0,
      bufferedEnd: 0,
    });
  },
  closePlayer: () => {
    get().videoEl?.pause();
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    set({ playerOpen: false, isPlaying: false, currentId: null });
  },

  togglePlay: () => {
    const el = get().videoEl;
    if (!el) return;
    if (el.paused) void el.play().catch(() => undefined);
    else el.pause();
  },
  seekTo: (t) => {
    const el = get().videoEl;
    if (!el) return;
    el.currentTime = clampTime(el, t);
    set({ currentTime: el.currentTime });
  },
  seekBy: (delta) => {
    const el = get().videoEl;
    if (!el) return;
    el.currentTime = clampTime(el, el.currentTime + delta);
    set({ currentTime: el.currentTime });
  },
  stepFrame: (dir) => {
    const el = get().videoEl;
    if (!el || !Number.isFinite(el.duration)) return;
    el.pause();
    el.currentTime = clampTime(el, el.currentTime + dir / 30);
    set({ currentTime: el.currentTime });
  },
  setVolume: (v) => {
    const volume = Math.min(1, Math.max(0, v));
    set({ volume, muted: volume === 0 ? true : get().muted });
    const el = get().videoEl;
    if (el) {
      el.volume = volume;
      el.muted = volume === 0 ? true : el.muted;
    }
  },
  toggleMute: () => {
    const muted = !get().muted;
    set({ muted });
    const el = get().videoEl;
    if (el) el.muted = muted;
  },
  setRate: (r) => {
    set({ rate: r });
    const el = get().videoEl;
    if (el) el.playbackRate = r;
  },
  toggleFullscreen: () => {
    const root = get().playerRoot;
    if (!root) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void root.requestFullscreen?.().catch(() => undefined);
    }
  },
  next: () => {
    const { queue, currentId } = get();
    const i = queue.indexOf(currentId ?? "");
    if (i >= 0 && i < queue.length - 1) get().openPlayer(queue[i + 1], queue);
  },
  prev: () => {
    const { queue, currentId } = get();
    const el = get().videoEl;
    // Restart when more than 3s in, like every sane player.
    if (el && el.currentTime > 3) {
      get().seekTo(0);
      return;
    }
    const i = queue.indexOf(currentId ?? "");
    if (i > 0) get().openPlayer(queue[i - 1], queue);
  },

  syncPlay: () => set({ isPlaying: true }),
  syncPause: () => set({ isPlaying: false }),
  syncTime: () => {
    const el = get().videoEl;
    if (!el) return;
    let bufferedEnd = 0;
    try {
      const b = el.buffered;
      if (b.length > 0) bufferedEnd = b.end(b.length - 1);
    } catch {
      /* ignore */
    }
    set({
      currentTime: el.currentTime,
      duration: Number.isFinite(el.duration) ? el.duration : 0,
      bufferedEnd,
    });
  },
  syncVolume: () => {
    const el = get().videoEl;
    if (!el) return;
    set({ volume: el.volume, muted: el.muted });
  },
  syncRate: () => {
    const el = get().videoEl;
    if (!el) return;
    set({ rate: el.playbackRate });
  },
  syncEnded: () => {
    set({ isPlaying: false });
    get().next();
  },
  syncFullscreen: (on) => set({ isFullscreen: on }),
}));
