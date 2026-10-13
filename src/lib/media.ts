/* Media probing and thumbnail generation.
   All functions work with File/Blob or URL strings and degrade
   gracefully (resolve with empty values, never reject) so imports
   never break on an odd file. */
import { kindFromName } from "./format";

/** Create a temp media element, resolve with metadata once known. */
function probeUrl(
  url: string,
  kind: "video" | "audio",
  timeoutMs = 9000
): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: { duration: number; width: number; height: number }) => {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      resolve(v);
    };
    const el = document.createElement(kind === "audio" ? "audio" : "video") as HTMLVideoElement;
    el.preload = "metadata";
    el.muted = true;
    const timer = window.setTimeout(() => finish({ duration: 0, width: 0, height: 0 }), timeoutMs);
    el.onloadedmetadata = () => {
      window.clearTimeout(timer);
      finish({
        duration: Number.isFinite(el.duration) ? el.duration : 0,
        width: el.videoWidth || 0,
        height: el.videoHeight || 0,
      });
    };
    el.onerror = () => {
      window.clearTimeout(timer);
      finish({ duration: 0, width: 0, height: 0 });
    };
    el.src = url;
  });
}

export async function probeFile(
  file: File
): Promise<{ duration: number; width: number; height: number; kind: "video" | "audio" }> {
  const kind = kindFromName(file.name);
  const url = URL.createObjectURL(file);
  const meta = await probeUrl(url, kind);
  return { ...meta, kind };
}

/**
 * Capture a single frame from a video source at `atTime` seconds.
 * Returns a jpeg data URL, or undefined when capture fails.
 */
export async function captureFrame(
  src: string,
  atTime: number,
  targetWidth = 320,
  quality = 0.72
): Promise<string | undefined> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v?: string) => {
      if (done) return;
      done = true;
      resolve(v);
    };
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    const timer = window.setTimeout(() => finish(undefined), 10000);
    video.onloadeddata = () => {
      const t = Math.min(Math.max(0, atTime), Math.max(0, (video.duration || 1) - 0.2));
      const onSeeked = () => {
        try {
          const scale = targetWidth / (video.videoWidth || targetWidth);
          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = Math.max(2, Math.round((video.videoHeight || 180) * scale));
          const ctx = canvas.getContext("2d");
          if (!ctx) return finish(undefined);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          window.clearTimeout(timer);
          finish(canvas.toDataURL("image/jpeg", quality));
        } catch {
          window.clearTimeout(timer);
          finish(undefined);
        }
      };
      video.onseeked = onSeeked;
      // If the requested time is ~0 the seek may never fire; capture directly.
      if (t < 0.05) {
        video.onseeked = null;
        onSeeked();
      } else {
        video.currentTime = t;
      }
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      finish(undefined);
    };
    video.src = src;
  });
}

/** Poster thumbnail for a freshly imported file. */
export async function generatePoster(file: File, duration: number): Promise<string | undefined> {
  const url = URL.createObjectURL(file);
  try {
    // Aim ~8% in, at least 1s, so we skip black leader frames.
    const at = duration > 0 ? Math.min(Math.max(1, duration * 0.08), duration - 0.5) : 1;
    return await captureFrame(url, Math.max(0.5, at));
  } finally {
    URL.revokeObjectURL(url);
  }
}
