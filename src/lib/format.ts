/* Pure formatting helpers. No DOM, no framework. Fully unit tested. */

/** 02:14 or 1:24:05 */
export function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? h + ":" : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

/** 1.4 GB, 720 MB, 12 KB ... */
export function formatBytes(bytes?: number): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / Math.pow(1024, i);
  return `${v >= 100 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

/** "1920×1080" or "—" */
export function formatResolution(w?: number, h?: number): string {
  if (!w || !h) return "—";
  return `${w}×${h}`;
}

/** Relative time: "2h ago", "3d ago" */
export function formatRelative(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

/** "0.62" progress fraction for partially watched media, null when not started */
export function progressFraction(item: { position?: number; duration: number }): number | null {
  if (!item.position || item.position <= 0 || !item.duration) return null;
  if (item.position >= item.duration - 5) return null; // treat as finished
  return Math.min(1, item.position / item.duration);
}

const VIDEO_EXTS = new Set([
  "mp4", "m4v", "mkv", "webm", "avi", "mov", "wmv", "flv", "ogv",
  "3gp", "ts", "m2ts", "vob", "mpg", "mpeg",
]);
const AUDIO_EXTS = new Set([
  "mp3", "m4a", "aac", "ogg", "oga", "opus", "flac", "wav", "wma", "aiff",
]);

export function kindFromName(name: string): "video" | "audio" {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (AUDIO_EXTS.has(ext)) return "audio";
  return "video"; // default: treat unknown as video
}

export function extFromName(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function isSupportedMediaFile(name: string): boolean {
  const ext = extFromName(name);
  return VIDEO_EXTS.has(ext) || AUDIO_EXTS.has(ext);
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
