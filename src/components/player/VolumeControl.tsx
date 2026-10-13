/* Volume control: level icon button opens a popover with a horizontal
   slider and a mute toggle. Icon reflects level: muted -> VolumeX,
   <50% -> Volume1, else Volume2. */
import { useRef, useState } from "react";
import { Volume1, Volume2, VolumeX } from "lucide-react";
import { IconButton, Slider } from "../ui";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { Popover } from "./Popover";

export function VolumeControl() {
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);

  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);

  const Icon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <>
      <IconButton
        ref={anchorRef}
        icon={Icon}
        label="Volume"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      />
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} align="right">
        <div className="w-56 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Volume</span>
            <span className="flex items-center gap-2">
              <span className="text-xs tabular-nums text-text-subtle">
                {Math.round(volume * 100)}%
              </span>
              <button
                type="button"
                role="menuitem"
                onClick={toggleMute}
                aria-label={muted ? "Unmute" : "Mute"}
                className="flex items-center gap-1.5 rounded-control px-2 py-1 text-xs text-text-muted transition-colors duration-200 ease-out hover:bg-bg-surface-2 hover:text-text-main"
              >
                {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                {muted ? "Unmute" : "Mute"}
              </button>
            </span>
          </div>
          <Slider
            label="Volume level"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(v) => setVolume(v / 100)}
          />
        </div>
      </Popover>
    </>
  );
}
