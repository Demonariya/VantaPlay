/* Subtitle helpers: SRT -> WebVTT conversion so sidecar subtitle
   files can be attached to the HTML video element as TextTracks. */

/** Convert SubRip content to WebVTT. Handles comma decimals and
    optional numeric cue identifiers. */
export function srtToVtt(srt: string): string {
  const normalized = srt.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return "WEBVTT\n\n";
  // Already WebVTT? pass through.
  if (/^WEBVTT/m.test(normalized)) return normalized;

  const withDots = normalized.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
  return `WEBVTT\n\n${withDots}\n`;
}

/** Read a File as text, with a size guard (10 MB). */
export function readSubtitleFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error("Subtitle file is larger than 10 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read subtitle file."));
    reader.readAsText(file);
  });
}

/** Build an object URL for VTT text. Caller must revoke when done. */
export function vttObjectUrl(vtt: string): string {
  return URL.createObjectURL(new Blob([vtt], { type: "text/vtt" }));
}
