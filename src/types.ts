/* Domain types for the VLC redesign app. Keep this file free of
   framework imports so it can be shared with tests and workers. */

export type MediaKind = "video" | "audio";

export interface MediaItem {
  id: string;
  /** Display name (file name or stream title) */
  name: string;
  kind: MediaKind;
  /** Runtime playback URL or native filesystem path. */
  src: string;
  /** Canonical local path used by libVLC in the Windows desktop build. */
  nativePath?: string;
  /** Original network URL for streams */
  streamUrl?: string;
  isStream?: boolean;
  /** Seconds. 0 when unknown (e.g. live stream). */
  duration: number;
  /** Bytes. Undefined for streams. */
  size?: number;
  mimeType?: string;
  /** Poster thumbnail as data URL (jpeg). Generated at import. */
  thumbnail?: string;
  width?: number;
  height?: number;
  addedAt: number;
  lastPlayedAt?: number;
  /** Resume position in seconds */
  position?: number;
  playCount?: number;
  /** Lowercase extension without dot, e.g. "mp4" */
  ext?: string;
}

export interface Playlist {
  id: string;
  name: string;
  itemIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface StreamEntry {
  id: string;
  name: string;
  url: string;
  addedAt: number;
  lastPlayedAt?: number;
}

export interface SubtitleTrack {
  id: string;
  label: string;
  lang?: string;
  /** object URL of a WebVTT file */
  src: string;
  /** true for tracks embedded/muxed in the media (metadata only) */
  embedded?: boolean;
}

export type AppView =
  | "home"
  | "library"
  | "playlists"
  | "streams"
  | "player";

export type LibraryViewMode = "grid" | "list";
export type LibrarySort = "recent" | "name" | "duration" | "added";

export interface ContextMenuState {
  x: number;
  y: number;
  kind: "media" | "playlist" | "stream";
  id: string;
}

export type ModalType =
  | "settings"
  | "properties"
  | "convert"
  | "addStream"
  | "newPlaylist"
  | "renamePlaylist"
  | "addSubtitles";

export interface ModalState {
  type: ModalType;
  /** media / playlist / stream id the modal acts on */
  targetId?: string;
}

/* ------------------------------ settings ------------------------------ */

export interface AppSettings {
  general: {
    language: string;
    checkForUpdates: boolean;
    confirmOnDelete: boolean;
    resumePlayback: boolean;
  };
  video: {
    hardwareAcceleration: boolean;
    deinterlace: "off" | "auto" | "on";
    fullscreenOnPlay: boolean;
  };
  audio: {
    volume: number; // 0..1
    normalizeVolume: boolean;
    preferredLanguage: string;
  };
  subtitles: {
    enabled: boolean;
    fontSize: number; // px scale base 16
    background: boolean;
  };
  advanced: {
    networkCachingMs: number;
    skipIntervalSec: number;
    thumbnailQuality: "low" | "medium" | "high";
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  general: {
    language: "system",
    checkForUpdates: true,
    confirmOnDelete: true,
    resumePlayback: true,
  },
  video: {
    hardwareAcceleration: true,
    deinterlace: "auto",
    fullscreenOnPlay: false,
  },
  audio: {
    volume: 0.8,
    normalizeVolume: false,
    preferredLanguage: "system",
  },
  subtitles: {
    enabled: true,
    fontSize: 16,
    background: true,
  },
  advanced: {
    networkCachingMs: 1000,
    skipIntervalSec: 10,
    thumbnailQuality: "medium",
  },
};
