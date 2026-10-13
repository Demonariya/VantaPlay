import { useLibraryStore } from "../stores/useLibraryStore";
import { useUIStore } from "../stores/useUIStore";
import {
  formatBytes,
  formatRelative,
  formatResolution,
  formatTime,
} from "../lib/format";
import { ModalShell } from "./ui";

export function PropertiesModal() {
  const modal = useUIStore((s) => s.modal);
  const closeModal = useUIStore((s) => s.closeModal);
  const items = useLibraryStore((s) => s.items);

  if (modal?.type !== "properties" || !modal.targetId) return null;
  const item = items.find((i) => i.id === modal.targetId);
  if (!item) return null;

  const rows: Array<[string, string]> = [
    ["Name", item.name],
    ["Type", item.kind === "audio" ? "Audio" : "Video"],
    ["Duration", item.duration > 0 ? formatTime(item.duration) : "Unknown"],
    ["Size", formatBytes(item.size)],
    ["Resolution", formatResolution(item.width, item.height)],
    ["Format", item.ext ? item.ext.toUpperCase() : "—"],
    ["Added", new Date(item.addedAt).toLocaleString()],
    ["Location", item.streamUrl ?? "Local file (stored in app library)"],
    ["Plays", String(item.playCount ?? 0)],
    ["Last played", item.lastPlayedAt ? formatRelative(item.lastPlayedAt) : "Never"],
  ];

  return (
    <ModalShell title="Properties" onClose={closeModal}>
      <dl className="divide-y divide-border-subtle">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-6 py-2.5">
            <dt className="shrink-0 text-sm text-text-subtle">{label}</dt>
            <dd className="break-all text-right text-sm text-text-main">{value}</dd>
          </div>
        ))}
      </dl>
    </ModalShell>
  );
}
