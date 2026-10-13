import { useState, type FormEvent } from "react";
import { useLibraryStore } from "../stores/useLibraryStore";
import { usePlayerStore } from "../stores/usePlayerStore";
import { useUIStore } from "../stores/useUIStore";
import { ModalShell } from "./ui";

const inputClass =
  "w-full rounded-control border border-border-subtle bg-bg-surface-2 px-3 py-2 text-sm text-text-main placeholder:text-text-subtle transition-colors duration-200 ease-out focus:border-accent-primary focus:outline-none";

export function AddStreamModal() {
  const modal = useUIStore((s) => s.modal);
  const closeModal = useUIStore((s) => s.closeModal);
  const addStreamUrl = useLibraryStore((s) => s.addStreamUrl);
  const openPlayer = usePlayerStore((s) => s.openPlayer);

  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (modal?.type !== "addStream") return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      setError("Enter a valid URL starting with http:// or https://");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const entry = await addStreamUrl(trimmed, name.trim() || undefined);
      const id = `stream-${entry.id}`;
      closeModal();
      openPlayer(id, [id]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add this stream.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Open network stream" onClose={closeModal}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="stream-url" className="mb-1.5 block text-sm text-text-main">
            Stream URL
          </label>
          <input
            id="stream-url"
            type="url"
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/stream.m3u8"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="stream-name" className="mb-1.5 block text-sm text-text-main">
            Name <span className="text-text-subtle">(optional)</span>
          </label>
          <input
            id="stream-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My favorite station"
            className={inputClass}
          />
        </div>
        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
        <p className="text-xs text-text-subtle">
          Supports HLS (.m3u8) and progressive streams. Saved to your streams list.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-control border border-border-subtle px-4 py-2 text-sm font-medium text-text-main transition-colors duration-200 ease-out hover:bg-bg-surface-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-control bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-200 ease-out hover:bg-accent-hover disabled:opacity-40"
          >
            {busy ? "Opening…" : "Open stream"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
