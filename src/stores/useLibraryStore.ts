/* Library domain: media items, playlists, network streams.
   Metadata + file bytes persist in IndexedDB; playback URLs are
   rebuilt on every boot. */
import { create } from "zustand";
import type { MediaItem, Playlist, StreamEntry } from "../types";
import {
  deleteMedia,
  deletePlaylist,
  deleteStream,
  getAllMedia,
  getAllPlaylists,
  getAllStreams,
  getBlob,
  putMedia,
  putPlaylist,
  putStream,
  type StoredMediaItem,
} from "../lib/db";
import { extFromName, isSupportedMediaFile, kindFromName, uid } from "../lib/format";
import { generatePoster, probeFile } from "../lib/media";

interface LibraryState {
  items: MediaItem[];
  playlists: Playlist[];
  streams: StreamEntry[];
  loaded: boolean;

  load: () => Promise<void>;
  importFiles: (files: File[] | FileList) => Promise<{ added: number; skipped: number }>;
  importNativePaths: (paths: string[]) => Promise<{ added: number; skipped: number }>;
  addStreamUrl: (url: string, name?: string) => Promise<StreamEntry>;
  removeStream: (id: string) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateItem: (id: string, patch: Partial<MediaItem>) => Promise<void>;
  touchPlayed: (id: string, position: number) => Promise<void>;
  markStarted: (id: string) => Promise<void>;

  createPlaylist: (name: string) => Promise<Playlist>;
  renamePlaylist: (id: string, name: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addToPlaylist: (playlistId: string, itemId: string) => Promise<void>;
  removeFromPlaylist: (playlistId: string, itemId: string) => Promise<void>;
}

function toRuntimeItem(stored: StoredMediaItem, src: string): MediaItem {
  return { ...stored, src };
}

export const useLibraryStore = create<LibraryState>()((set, get) => ({
  items: [],
  playlists: [],
  streams: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    const [media, playlists, streams] = await Promise.all([
      getAllMedia(),
      getAllPlaylists(),
      getAllStreams(),
    ]);
    const items: MediaItem[] = [];
    for (const m of media) {
      let src = "";
      if (m.nativePath) {
        src = m.nativePath;
      } else if (m.isStream && m.streamUrl) {
        src = m.streamUrl;
      } else {
        const blob = await getBlob(m.id);
        if (blob) src = URL.createObjectURL(blob);
      }
      if (src) items.push(toRuntimeItem(m, src));
      // Items whose bytes are gone (should not normally happen) are dropped.
    }
    set({ items, playlists, streams, loaded: true });
  },

  importFiles: async (files) => {
    const list = Array.from(files).filter((f) => isSupportedMediaFile(f.name));
    const skipped = Array.from(files).length - list.length;
    let added = 0;
    const existing = new Set(get().items.map((i) => `${i.name}:${i.size ?? 0}`));
    for (const file of list) {
      const dedupe = `${file.name}:${file.size}`;
      if (existing.has(dedupe)) continue;
      existing.add(dedupe);
      try {
        const meta = await probeFile(file);
        const kind = meta.kind ?? kindFromName(file.name);
        const id = uid();
        const thumbnail =
          kind === "video" ? await generatePoster(file, meta.duration) : undefined;
        const stored: StoredMediaItem = {
          id,
          name: file.name,
          kind,
          isStream: false,
          duration: meta.duration,
          size: file.size,
          mimeType: file.type || undefined,
          thumbnail,
          width: meta.width || undefined,
          height: meta.height || undefined,
          addedAt: Date.now(),
          playCount: 0,
          ext: extFromName(file.name),
        };
        await putMedia(stored, file);
        set((s) => ({
          items: [...s.items, toRuntimeItem(stored, URL.createObjectURL(file))],
        }));
        added += 1;
      } catch {
        // One bad file must not abort the batch.
      }
    }
    return { added, skipped };
  },

  importNativePaths: async (paths) => {
    let added = 0;
    let skipped = 0;
    const knownPaths = new Set(get().items.map((item) => item.nativePath).filter(Boolean));
    for (const nativePath of paths) {
      const name = nativePath.split(/[\\/]/).filter(Boolean).pop() ?? nativePath;
      if (!isSupportedMediaFile(name) || knownPaths.has(nativePath)) { skipped += 1; continue; }
      knownPaths.add(nativePath);
      const stored: StoredMediaItem = {
        id: uid(), name, kind: kindFromName(name), nativePath, isStream: false,
        duration: 0, addedAt: Date.now(), playCount: 0, ext: extFromName(name),
      };
      await putMedia(stored);
      set((s) => ({ items: [...s.items, toRuntimeItem(stored, nativePath)] }));
      added += 1;
    }
    return { added, skipped };
  },

  addStreamUrl: async (url, name) => {
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      throw new Error("Stream URL must start with http:// or https://");
    }
    const entry: StreamEntry = {
      id: uid(),
      name: name?.trim() || hostFromUrl(trimmed),
      url: trimmed,
      addedAt: Date.now(),
    };
    await putStream(entry);
    // Also surface it as a playable library item.
    const item: StoredMediaItem = {
      id: `stream-${entry.id}`,
      name: entry.name,
      kind: "video",
      isStream: true,
      streamUrl: entry.url,
      duration: 0,
      addedAt: entry.addedAt,
      playCount: 0,
      ext: "stream",
    };
    await putMedia(item);
    set((s) => ({
      streams: [...s.streams, entry],
      items: [...s.items, toRuntimeItem(item, entry.url)],
    }));
    return entry;
  },

  removeStream: async (id) => {
    await deleteStream(id);
    await deleteMedia(`stream-${id}`);
    set((s) => ({
      streams: s.streams.filter((x) => x.id !== id),
      items: s.items.filter((x) => x.id !== `stream-${id}`),
    }));
  },

  removeItem: async (id) => {
    await deleteMedia(id);
    set((s) => ({
      items: s.items.filter((x) => x.id !== id),
      playlists: s.playlists.map((p) => ({
        ...p,
        itemIds: p.itemIds.filter((x) => x !== id),
      })),
    }));
  },

  updateItem: async (id, patch) => {
    const item = get().items.find((x) => x.id === id);
    if (!item) return;
    const { src: _src, ...stored } = { ...item, ...patch };
    await putMedia(stored);
    set((s) => ({
      items: s.items.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  },

  touchPlayed: async (id, position) => {
    const item = get().items.find((x) => x.id === id);
    if (!item) return;
    const patch = { lastPlayedAt: Date.now(), position };
    set((s) => ({
      items: s.items.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
    const { src: _src, ...stored } = { ...item, ...patch };
    await putMedia(stored);
  },

  markStarted: async (id) => {
    const item = get().items.find((x) => x.id === id);
    if (!item) return;
    const patch = {
      lastPlayedAt: Date.now(),
      playCount: (item.playCount ?? 0) + 1,
      position: item.position && item.position > 5 ? item.position : 0,
    };
    set((s) => ({
      items: s.items.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
    const { src: _src, ...stored } = { ...item, ...patch };
    await putMedia(stored);
  },

  createPlaylist: async (name) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Playlist name cannot be empty.");
    const p: Playlist = {
      id: uid(),
      name: trimmed,
      itemIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await putPlaylist(p);
    set((s) => ({ playlists: [...s.playlists, p] }));
    return p;
  },

  renamePlaylist: async (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Playlist name cannot be empty.");
    set((s) => ({
      playlists: s.playlists.map((p) =>
        p.id === id ? { ...p, name: trimmed, updatedAt: Date.now() } : p
      ),
    }));
    const p = get().playlists.find((x) => x.id === id);
    if (p) await putPlaylist(p);
  },

  deletePlaylist: async (id) => {
    await deletePlaylist(id);
    set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) }));
  },

  addToPlaylist: async (playlistId, itemId) => {
    const p = get().playlists.find((x) => x.id === playlistId);
    if (!p || p.itemIds.includes(itemId)) return;
    const next = { ...p, itemIds: [...p.itemIds, itemId], updatedAt: Date.now() };
    await putPlaylist(next);
    set((s) => ({ playlists: s.playlists.map((x) => (x.id === playlistId ? next : x)) }));
  },

  removeFromPlaylist: async (playlistId, itemId) => {
    const p = get().playlists.find((x) => x.id === playlistId);
    if (!p) return;
    const next = {
      ...p,
      itemIds: p.itemIds.filter((x) => x !== itemId),
      updatedAt: Date.now(),
    };
    await putPlaylist(next);
    set((s) => ({ playlists: s.playlists.map((x) => (x.id === playlistId ? next : x)) }));
  },
}));

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
