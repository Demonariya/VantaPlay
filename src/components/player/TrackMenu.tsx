/* Subtitles and audio track selector. Subtitles section: Off + each
   loaded sidecar track (checked when active) + "Load subtitles" file
   picker (.srt/.vtt, converted to WebVTT and attached). Audio section:
   muxed audio tracks when the element exposes more than one, otherwise
   a disabled "Default audio" row. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Captions, Check, Upload } from "lucide-react";
import { IconButton } from "../ui";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { useSubtitleStore } from "./subtitleStore";
import { readSubtitleFile, srtToVtt, vttObjectUrl } from "../../lib/subtitles";
import { uid } from "../../lib/format";
import { Popover } from "./Popover";
import { cn } from "../../lib/cn";

interface AudioTrackLike {
  id: string;
  label: string;
  language: string;
  enabled: boolean;
}

interface AudioTrackListLike {
  length: number;
  [index: number]: { id?: string; label?: string; language?: string; enabled: boolean };
}

/** Muxed audio tracks, exposed natively (Safari) via HTMLMediaElement.audioTracks. */
function readAudioTracks(el: HTMLVideoElement | null): AudioTrackLike[] {
  const list = (el as unknown as { audioTracks?: AudioTrackListLike } | null)?.audioTracks;
  if (!list || list.length === 0) return [];
  const out: AudioTrackLike[] = [];
  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    out.push({
      id: t.id ?? String(i),
      label: t.label || `Track ${i + 1}`,
      language: t.language ?? "",
      enabled: t.enabled,
    });
  }
  return out;
}

function MenuRow({
  active,
  onClick,
  children,
  disabled,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={!!active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm",
        "text-text-muted transition-colors duration-200 ease-out",
        "hover:bg-bg-surface-2 hover:text-text-main",
        "disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-text-muted",
        active && "text-text-main"
      )}
    >
      <span className="w-4 shrink-0">{active && <Check size={16} className="text-accent-primary" />}</span>
      <span className="flex-1 truncate">{children}</span>
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
      {children}
    </p>
  );
}

export function TrackMenu() {
  const videoEl = usePlayerStore((s) => s.videoEl);
  const tracks = useSubtitleStore((s) => s.tracks);
  const activeId = useSubtitleStore((s) => s.activeId);
  const addTrack = useSubtitleStore((s) => s.addTrack);
  const setActiveSubtitle = useSubtitleStore((s) => s.setActiveSubtitle);

  const [open, setOpen] = useState(false);
  const [audioTracks, setAudioTracks] = useState<AudioTrackLike[]>([]);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Refresh the muxed audio list each time the menu opens.
  useEffect(() => {
    if (open) setAudioTracks(readAudioTracks(videoEl));
  }, [open, videoEl]);

  const selectAudio = (id: string) => {
    const list = (videoEl as unknown as { audioTracks?: AudioTrackListLike } | null)?.audioTracks;
    if (list) {
      for (let i = 0; i < list.length; i++) {
        list[i].enabled = (list[i].id ?? String(i)) === id;
      }
    }
    setAudioTracks((prev) => prev.map((t) => ({ ...t, enabled: t.id === id })));
  };

  const onPickFile = async (file: File) => {
    try {
      const text = await readSubtitleFile(file);
      const src = vttObjectUrl(srtToVtt(text));
      const id = uid();
      addTrack({ id, label: file.name.replace(/\.(srt|vtt)$/i, ""), src });
      setActiveSubtitle(id);
    } catch {
      /* oversized or unreadable subtitle file: ignore */
    }
  };

  return (
    <>
      <IconButton
        ref={anchorRef}
        icon={Captions}
        label="Subtitles and audio tracks"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      />
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} align="right">
        <div className="max-h-80 w-64 overflow-y-auto p-1.5">
          <SectionLabel>Subtitles</SectionLabel>
          <MenuRow active={activeId === null} onClick={() => setActiveSubtitle(null)}>
            Off
          </MenuRow>
          {tracks.map((t) => (
            <MenuRow key={t.id} active={t.id === activeId} onClick={() => setActiveSubtitle(t.id)}>
              {t.label}
            </MenuRow>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm text-text-muted transition-colors duration-200 ease-out hover:bg-bg-surface-2 hover:text-text-main"
          >
            <span className="w-4 shrink-0">
              <Upload size={16} />
            </span>
            Load subtitles
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".srt,.vtt"
            className="hidden"
            aria-label="Choose subtitle file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void onPickFile(file);
            }}
          />

          <SectionLabel>Audio</SectionLabel>
          {audioTracks.length > 1 ? (
            audioTracks.map((t) => (
              <MenuRow key={t.id} active={t.enabled} onClick={() => selectAudio(t.id)}>
                {t.label}
                {t.language && <span className="text-text-subtle"> ({t.language})</span>}
              </MenuRow>
            ))
          ) : (
            <MenuRow active disabled>
              Default audio
            </MenuRow>
          )}
        </div>
      </Popover>
    </>
  );
}
