/* Convert / Stream dialog: real client-side transcoding via ffmpeg.wasm.
   Runs entirely on-device; the engine (~30 MB wasm) lazy-loads on start. */
import { useRef, useState } from "react";
import { CheckCircle2, Download, FolderPlus, Play } from "lucide-react";
import { ModalShell, Select } from "./ui";
import { useUIStore } from "../stores/useUIStore";
import { useLibraryStore } from "../stores/useLibraryStore";
import { usePlayerStore } from "../stores/usePlayerStore";
import { getBlob } from "../lib/db";
import type {
  TranscodeFormat,
  TranscodeQuality,
  TranscodeResolution,
} from "../lib/transcode";
import { cn } from "../lib/cn";

type Phase = "idle" | "loading" | "working" | "done" | "error";

interface DoneResult {
  blob: Blob;
  fileName: string;
  url: string;
}

export function ConvertDialog() {
  const modal = useUIStore((s) => s.modal);
  const closeModal = useUIStore((s) => s.closeModal);
  const item = useLibraryStore((s) => s.items.find((i) => i.id === modal?.targetId));

  const [format, setFormat] = useState<TranscodeFormat>("mp4");
  const [quality, setQuality] = useState<TranscodeQuality>("medium");
  const [resolution, setResolution] = useState<TranscodeResolution>("original");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DoneResult | null>(null);
  const cancelRef = useRef(false);

  const open = modal?.type === "convert" && !!item;
  if (!open || !item) return null;

  const isStream = !!item.isStream;

  async function start() {
    const current = item;
    if (!current) return;
    cancelRef.current = false;
    setError(null);
    setResult(null);
    setProgress(0);
    setPhase("loading");
    try {
      const bytes = await getBlob(current.id);
      if (!bytes) throw new Error("The file bytes for this item are not available.");
      // The ffmpeg engine (and its ~30 MB wasm) loads only when Convert runs.
      const { loadTranscoder, transcode } = await import("../lib/transcode");
      await loadTranscoder();
      if (cancelRef.current) {
        setPhase("idle");
        return;
      }
      setPhase("working");
      const res = await transcode(
        bytes,
        current.name,
        { format, quality, resolution },
        (p) => setProgress(p.ratio),
        () => cancelRef.current
      );
      if (cancelRef.current) {
        setPhase("idle");
        return;
      }
      setResult({ ...res, url: URL.createObjectURL(res.blob) });
      setPhase("done");
    } catch (e) {
      if (cancelRef.current || (e as Error).message === "cancelled") {
        setPhase("idle");
        return;
      }
      setError((e as Error).message || "Conversion failed.");
      setPhase("error");
    }
  }

  function cancel() {
    cancelRef.current = true;
    // Drop the engine without pulling it into the main bundle.
    void import("../lib/transcode").then((m) => m.terminateTranscoder());
    setPhase("idle");
  }

  async function addToLibraryAndPlay(play: boolean) {
    if (!result) return;
    const file = new File([result.blob], result.fileName, { type: result.blob.type });
    await useLibraryStore.getState().importFiles([file]);
    const added = useLibraryStore
      .getState()
      .items.find((i) => i.name === result.fileName);
    closeModal();
    if (play && added) {
      usePlayerStore.getState().openPlayer(added.id, [added.id]);
    }
  }

  const busy = phase === "loading" || phase === "working";

  return (
    <ModalShell title="Convert media" onClose={closeModal}>
      <p className="text-sm text-text-muted">
        Source: <span className="text-text-main font-medium">{item.name}</span>
      </p>

      {isStream ? (
        <p className="mt-4 rounded-control border border-border-subtle bg-bg-surface-2 p-3 text-sm text-text-muted">
          Conversion needs a local file. Network streams cannot be converted.
        </p>
      ) : (
        <>
          <div className="mt-2">
            <Select
              label="Format"
              value={format}
              onChange={(v) => setFormat(v as TranscodeFormat)}
              options={[
                { value: "mp4", label: "MP4 (H.264 + AAC)" },
                { value: "webm", label: "WebM (VP9 + Opus)" },
                { value: "mp3", label: "MP3 (audio only)" },
              ]}
            />
            <Select
              label="Quality"
              value={quality}
              onChange={(v) => setQuality(v as TranscodeQuality)}
              options={[
                { value: "high", label: "High" },
                { value: "medium", label: "Medium" },
                { value: "low", label: "Low (smaller file)" },
              ]}
            />
            <Select
              label="Resolution"
              value={resolution}
              onChange={(v) => setResolution(v as TranscodeResolution)}
              description={format === "mp3" ? "Not applicable to audio." : undefined}
              options={[
                { value: "original", label: "Original" },
                { value: "1080p", label: "1080p" },
                { value: "720p", label: "720p" },
                { value: "480p", label: "480p" },
              ]}
            />
          </div>

          <p className="mt-2 text-xs text-text-subtle">
            Conversion runs entirely on this device. Large files can take a while.
          </p>

          {phase === "error" && error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}

          {(phase === "loading" || phase === "working") && (
            <div className="mt-4">
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
                aria-label="Conversion progress"
                className="h-2 overflow-hidden rounded-pill bg-bg-surface-2"
              >
                <div
                  className={cn(
                    "h-full rounded-pill bg-accent-primary transition-[width] duration-200",
                    phase === "loading" && "skeleton w-full"
                  )}
                  style={phase === "working" ? { width: `${Math.round(progress * 100)}%` } : undefined}
                />
              </div>
              <p className="mt-1.5 text-xs text-text-muted" aria-live="polite">
                {phase === "loading"
                  ? "Loading the conversion engine…"
                  : `Converting… ${Math.round(progress * 100)}%`}
              </p>
            </div>
          )}

          {phase === "done" && result && (
            <div className="anim-pop-in mt-4 rounded-control border border-border-subtle bg-bg-surface-2 p-3">
              <p className="flex items-center gap-2 text-sm text-text-main">
                <CheckCircle2 size={16} className="text-success" />
                Done: <span className="font-medium">{result.fileName}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={result.url}
                  download={result.fileName}
                  className="inline-flex items-center gap-1.5 rounded-control bg-accent-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
                >
                  <Download size={15} /> Download
                </a>
                <button
                  type="button"
                  onClick={() => void addToLibraryAndPlay(false)}
                  className="inline-flex items-center gap-1.5 rounded-control border border-border-subtle px-3 py-1.5 text-sm text-text-main transition-colors hover:bg-bg-surface-2"
                >
                  <FolderPlus size={15} /> Add to library
                </button>
                <button
                  type="button"
                  onClick={() => void addToLibraryAndPlay(true)}
                  className="inline-flex items-center gap-1.5 rounded-control border border-border-subtle px-3 py-1.5 text-sm text-text-main transition-colors hover:bg-bg-surface-2"
                >
                  <Play size={15} /> Play now
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            {busy ? (
              <button
                type="button"
                onClick={cancel}
                className="rounded-control border border-border-subtle px-4 py-2 text-sm text-text-main transition-colors hover:bg-bg-surface-2"
              >
                Cancel
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-control border border-border-subtle px-4 py-2 text-sm text-text-muted transition-colors hover:bg-bg-surface-2 hover:text-text-main"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => void start()}
                  disabled={phase === "done" && !result}
                  className="rounded-control bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
                >
                  {phase === "done" ? "Convert again" : "Start conversion"}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </ModalShell>
  );
}
