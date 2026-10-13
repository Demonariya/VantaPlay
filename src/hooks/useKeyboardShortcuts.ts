/* Global keyboard shortcuts. Mounted once from App. */

import { useEffect } from "react";
import { usePlayerStore } from "../stores/usePlayerStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import { useUIStore } from "../stores/useUIStore";

function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  ) {
    return true;
  }
  return el.isContentEditable;
}

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUIStore.getState();
      const player = usePlayerStore.getState();

      // Cmd/Ctrl+K toggles the command palette everywhere.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ui.setPaletteOpen(!ui.paletteOpen);
        return;
      }

      // Esc unwinds UI layers, innermost first.
      if (e.key === "Escape") {
        if (ui.contextMenu) {
          ui.closeContextMenu();
          return;
        }
        if (ui.modal) {
          ui.closeModal();
          return;
        }
        if (ui.paletteOpen) {
          ui.setPaletteOpen(false);
          return;
        }
        if (player.playerOpen) {
          player.closePlayer();
        }
        return;
      }

      // Player transport keys: never hijack typing or button activation.
      if (!player.playerOpen || isEditable(e.target)) return;
      if (e.code === "Space" && e.target instanceof HTMLButtonElement) return;

      const skip = useSettingsStore.getState().settings.advanced.skipIntervalSec;
      switch (e.code) {
        case "Space":
          e.preventDefault();
          player.togglePlay();
          break;
        case "ArrowLeft":
          player.seekBy(-skip);
          break;
        case "ArrowRight":
          player.seekBy(skip);
          break;
        case "ArrowUp":
          e.preventDefault();
          player.setVolume(player.volume + 0.05);
          break;
        case "ArrowDown":
          e.preventDefault();
          player.setVolume(player.volume - 0.05);
          break;
        case "KeyF":
          player.toggleFullscreen();
          break;
        case "KeyM":
          player.toggleMute();
          break;
        case "KeyN":
          player.next();
          break;
        case "KeyP":
          player.prev();
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
}
