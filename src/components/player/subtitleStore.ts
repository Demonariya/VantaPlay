/* Sidecar subtitle tracks for the player. VideoSurface renders the
   <track> elements from this store; TrackMenu adds/removes/selects.
   Track modes are pushed onto the video element via applyTo() because
   <track> elements only expose their TextTrack after parsing. */
import { create } from "zustand";
import type { SubtitleTrack } from "../../types";

interface SubtitleState {
  tracks: SubtitleTrack[];
  /** id of the track currently showing, null = subtitles off */
  activeId: string | null;
  addTrack: (t: SubtitleTrack) => void;
  removeTrack: (id: string) => void;
  clear: () => void;
  setActiveSubtitle: (id: string | null) => void;
  /** Align video.textTracks modes with the store (<track> order = tracks order). */
  applyTo: (video: HTMLVideoElement, enabled: boolean) => void;
}

function revoke(t: SubtitleTrack): void {
  if (t.src.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(t.src);
    } catch {
      /* already revoked */
    }
  }
}

export const useSubtitleStore = create<SubtitleState>()((set, get) => ({
  tracks: [],
  activeId: null,

  addTrack: (t) =>
    set((s) => ({
      tracks: [...s.tracks, t],
      activeId: s.activeId ?? t.id,
    })),

  removeTrack: (id) => {
    const track = get().tracks.find((t) => t.id === id);
    if (track) revoke(track);
    set((s) => ({
      tracks: s.tracks.filter((t) => t.id !== id),
      activeId: s.activeId === id ? null : s.activeId,
    }));
  },

  clear: () => {
    for (const t of get().tracks) revoke(t);
    set({ tracks: [], activeId: null });
  },

  setActiveSubtitle: (id) => set({ activeId: id }),

  applyTo: (video, enabled) => {
    const { tracks, activeId } = get();
    const external = tracks.filter((t) => !t.embedded);
    const textTracks = video.textTracks;
    // <track> elements render in `external` order, so index i aligns.
    for (let i = 0; i < textTracks.length; i++) {
      const track = textTracks[i];
      const match = external[i];
      track.mode = enabled && match && match.id === activeId ? "showing" : "disabled";
    }
  },
}));
