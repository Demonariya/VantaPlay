/* Playback speed selector. Shows the current rate as a text button
   ("1x"); the popover lists 0.5x to 2.0x with the active one checked. */
import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { Popover } from "./Popover";
import { cn } from "../../lib/cn";

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function SpeedMenu() {
  const rate = usePlayerStore((s) => s.rate);
  const setRate = usePlayerStore((s) => s.setRate);

  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-label="Playback speed"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Playback speed"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "h-10 shrink-0 rounded-control px-2.5 text-sm font-medium tabular-nums",
          "text-text-muted transition-all duration-200 ease-out",
          "hover:bg-bg-surface-2 hover:text-text-main active:scale-95"
        )}
      >
        {rate}x
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} align="right">
        <div className="w-40 p-1.5">
          {RATES.map((r) => {
            const active = rate === r;
            return (
              <button
                key={r}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setRate(r);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm tabular-nums",
                  "text-text-muted transition-colors duration-200 ease-out",
                  "hover:bg-bg-surface-2 hover:text-text-main",
                  active && "text-text-main"
                )}
              >
                <span className="w-4 shrink-0">
                  {active && <Check size={16} className="text-accent-primary" />}
                </span>
                {r}x
              </button>
            );
          })}
        </div>
      </Popover>
    </>
  );
}
