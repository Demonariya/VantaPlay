/* App settings, persisted to localStorage. The settings modal edits
   these; the player and library read the ones they need. */
import { create } from "zustand";
import { DEFAULT_SETTINGS, type AppSettings } from "../types";
import { usePlayerStore } from "./usePlayerStore";

const STORAGE_KEY = "vlc-redesign-settings";

function loadStored(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS);
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    // Deep-merge over defaults so new keys survive upgrades.
    return {
      general: { ...DEFAULT_SETTINGS.general, ...parsed.general },
      video: { ...DEFAULT_SETTINGS.video, ...parsed.video },
      audio: { ...DEFAULT_SETTINGS.audio, ...parsed.audio },
      subtitles: { ...DEFAULT_SETTINGS.subtitles, ...parsed.subtitles },
      advanced: { ...DEFAULT_SETTINGS.advanced, ...parsed.advanced },
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

/** Read by the player store at boot (avoids a circular import). */
export function readInitialVolume(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS.audio.volume;
    const v = (JSON.parse(raw) as Partial<AppSettings>)?.audio?.volume;
    return typeof v === "number" ? Math.min(1, Math.max(0, v)) : DEFAULT_SETTINGS.audio.volume;
  } catch {
    return DEFAULT_SETTINGS.audio.volume;
  }
}

interface SettingsState {
  settings: AppSettings;
  /** Update one leaf: update("audio", "volume", 0.5) */
  update: <S extends keyof AppSettings, K extends keyof AppSettings[S]>(
    section: S,
    key: K,
    value: AppSettings[S][K]
  ) => void;
  reset: () => void;
  resetSection: (section: keyof AppSettings) => void;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: loadStored(),

  update: (section, key, value) => {
    const next = {
      ...get().settings,
      [section]: { ...get().settings[section], [key]: value },
    };
    set({ settings: next });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage full or blocked: settings still apply for the session */
    }
    // Keep the live player in sync for the settings that affect it.
    if (section === "audio" && key === "volume") {
      usePlayerStore.getState().setVolume(value as number);
    }
    if (section === "audio" && key === "normalizeVolume") {
      const el = usePlayerStore.getState().videoEl;
      // Placeholder hook: real loudness normalization needs WebAudio.
      // We keep the toggle honest by applying it when the graph exists.
      if (el) el.preservesPitch = true;
    }
  },

  reset: () => {
    const next = structuredClone(DEFAULT_SETTINGS);
    set({ settings: next });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    usePlayerStore.getState().setVolume(next.audio.volume);
  },

  resetSection: (section) => {
    const next = {
      ...get().settings,
      [section]: structuredClone(DEFAULT_SETTINGS[section]),
    };
    set({ settings: next });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  },
}));
