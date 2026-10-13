/* Client-side media transcoding powered by ffmpeg.wasm.
   Uses the single-threaded core, so no COOP/COEP headers are needed.
   Everything runs locally on the device; nothing is uploaded. */
import { FFmpeg } from "@ffmpeg/ffmpeg";
import coreURL from "@ffmpeg/core?url";
import wasmURL from "@ffmpeg/core/wasm?url";

export type TranscodeFormat = "mp4" | "webm" | "mp3";
export type TranscodeQuality = "high" | "medium" | "low";
export type TranscodeResolution = "original" | "1080p" | "720p" | "480p";

export interface TranscodeOptions {
  format: TranscodeFormat;
  quality: TranscodeQuality;
  resolution: TranscodeResolution;
}

export interface TranscodeProgress {
  /** 0..1 */
  ratio: number;
}

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;
  if (!loadPromise) {
    loadPromise = (async () => {
      const ff = new FFmpeg();
      await ff.load({ coreURL, wasmURL });
      ffmpeg = ff;
      return ff;
    })().catch((err) => {
      loadPromise = null;
      throw err;
    });
  }
  return loadPromise;
}

/** Download and initialize the encoder. Call early so Convert feels instant. */
export async function loadTranscoder(): Promise<void> {
  await getFFmpeg();
}

/** Abort any in-flight job and drop the engine so the next run starts clean. */
export function terminateTranscoder(): void {
  try {
    ffmpeg?.terminate();
  } catch {
    /* already gone */
  }
  ffmpeg = null;
  loadPromise = null;
}

const CRF: Record<TranscodeFormat, Record<TranscodeQuality, string>> = {
  mp4: { high: "21", medium: "26", low: "31" },
  webm: { high: "30", medium: "36", low: "42" },
  mp3: { high: "192k", medium: "128k", low: "96k" },
};

function buildArgs(inFile: string, outFile: string, opts: TranscodeOptions): string[] {
  const args = ["-i", inFile, "-y"];
  if (opts.format === "mp3") {
    args.push("-vn", "-c:a", "libmp3lame", "-b:a", CRF.mp3[opts.quality]);
  } else if (opts.format === "mp4") {
    args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", CRF.mp4[opts.quality]);
    if (opts.resolution !== "original") {
      args.push("-vf", `scale=-2:${opts.resolution.replace("p", "")}`);
    }
    args.push("-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart");
  } else {
    args.push("-c:v", "libvpx-vp9", "-b:v", "0", "-crf", CRF.webm[opts.quality]);
    if (opts.resolution !== "original") {
      args.push("-vf", `scale=-2:${opts.resolution.replace("p", "")}`);
    }
    args.push("-c:a", "libopus", "-b:a", "128k");
  }
  args.push(outFile);
  return args;
}

export async function transcode(
  input: Blob,
  inputName: string,
  opts: TranscodeOptions,
  onProgress: (p: TranscodeProgress) => void,
  shouldCancel: () => boolean
): Promise<{ blob: Blob; fileName: string }> {
  const ff = await getFFmpeg();
  const ext =
    (inputName.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const inFile = `input.${ext}`;
  const outFile = `output.${opts.format}`;
  const base = inputName.replace(/\.[^.]+$/, "") || "converted";

  await ff.writeFile(inFile, new Uint8Array(await input.arrayBuffer()));

  const onProg = ({ progress }: { progress: number }) => {
    onProgress({ ratio: Math.min(1, Math.max(0, progress || 0)) });
  };
  ff.on("progress", onProg);
  try {
    const code = await ff.exec(buildArgs(inFile, outFile, opts));
    if (shouldCancel()) throw new Error("cancelled");
    if (code !== 0) throw new Error(`The encoder exited with code ${code}.`);
    const data = (await ff.readFile(outFile)) as Uint8Array;
    const mime =
      opts.format === "mp4" ? "video/mp4" : opts.format === "webm" ? "video/webm" : "audio/mpeg";
    // Copy into a fresh ArrayBuffer: wasm memory views are ArrayBufferLike,
    // which BlobPart does not accept.
    const bytes = Uint8Array.from(data);
    return { blob: new Blob([bytes.buffer], { type: mime }), fileName: `${base}.${opts.format}` };
  } finally {
    ff.off("progress", onProg);
    await ff.deleteFile(inFile).catch(() => undefined);
    await ff.deleteFile(outFile).catch(() => undefined);
  }
}
