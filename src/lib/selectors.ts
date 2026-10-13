/* Pure selectors over the media library. No framework imports. */
import type { LibrarySort, MediaItem } from "../types";

/** Partially watched items, most recently played first. */
export function selectContinueWatching(items: MediaItem[], limit = 12): MediaItem[] {
  return items
    .filter((i) => {
      const p = i.position ?? 0;
      return p > 5 && i.duration > 0 && p < i.duration - 10;
    })
    .sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0))
    .slice(0, limit);
}

/** Newest imports first. */
export function selectRecent(items: MediaItem[], limit = 12): MediaItem[] {
  return [...items].sort((a, b) => b.addedAt - a.addedAt).slice(0, limit);
}

export function searchItems(items: MediaItem[], query: string): MediaItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (i) =>
      i.name.toLowerCase().includes(q) ||
      (i.ext ?? "").toLowerCase().includes(q)
  );
}

export function sortItems(items: MediaItem[], sort: LibrarySort): MediaItem[] {
  const arr = [...items];
  switch (sort) {
    case "name":
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    case "duration":
      return arr.sort((a, b) => b.duration - a.duration);
    case "added":
      return arr.sort((a, b) => b.addedAt - a.addedAt);
    case "recent":
    default:
      return arr.sort((a, b) => (b.lastPlayedAt ?? b.addedAt) - (a.lastPlayedAt ?? a.addedAt));
  }
}

/** Group items by a folder-ish key: streams bucket, else first path-ish segment. */
export function groupKey(item: MediaItem): string {
  if (item.isStream) return "Streams";
  return "Local files";
}
