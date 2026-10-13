/* IndexedDB persistence via `idb`.
   Stores:
   - media: MediaItem metadata (without src/blob)
   - blobs: { id, blob } — the actual file bytes for local media
   - playlists, streams: plain records
   - kv: misc (reserved)
*/
import { openDB, type IDBPDatabase } from "idb";
import type { MediaItem, Playlist, StreamEntry } from "../types";

const DB_NAME = "vlc-redesign";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        d.createObjectStore("media", { keyPath: "id" });
        d.createObjectStore("blobs", { keyPath: "id" });
        d.createObjectStore("playlists", { keyPath: "id" });
        d.createObjectStore("streams", { keyPath: "id" });
        d.createObjectStore("kv", { keyPath: "key" });
      },
    });
  }
  return dbPromise;
}

export type StoredMediaItem = Omit<MediaItem, "src">;

export async function putMedia(item: StoredMediaItem, blob?: Blob): Promise<void> {
  const d = await db();
  const tx = d.transaction(["media", "blobs"], "readwrite");
  await tx.objectStore("media").put(item);
  if (blob) await tx.objectStore("blobs").put({ id: item.id, blob });
  await tx.done;
}

export async function getAllMedia(): Promise<StoredMediaItem[]> {
  return (await db()).getAll("media");
}

export async function getBlob(id: string): Promise<Blob | undefined> {
  const rec = await (await db()).get("blobs", id);
  return rec?.blob as Blob | undefined;
}

export async function deleteMedia(id: string): Promise<void> {
  const d = await db();
  const tx = d.transaction(["media", "blobs"], "readwrite");
  await tx.objectStore("media").delete(id);
  await tx.objectStore("blobs").delete(id);
  await tx.done;
}

export async function putPlaylist(p: Playlist): Promise<void> {
  await (await db()).put("playlists", p);
}
export async function getAllPlaylists(): Promise<Playlist[]> {
  return (await db()).getAll("playlists");
}
export async function deletePlaylist(id: string): Promise<void> {
  await (await db()).delete("playlists", id);
}

export async function putStream(s: StreamEntry): Promise<void> {
  await (await db()).put("streams", s);
}
export async function getAllStreams(): Promise<StreamEntry[]> {
  return (await db()).getAll("streams");
}
export async function deleteStream(id: string): Promise<void> {
  await (await db()).delete("streams", id);
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  const rec = await (await db()).get("kv", key);
  return rec?.value as T | undefined;
}
export async function kvSet(key: string, value: unknown): Promise<void> {
  await (await db()).put("kv", { key, value });
}
