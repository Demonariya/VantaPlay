import { useEffect, useState, type FormEvent } from "react";
import { useLibraryStore } from "../stores/useLibraryStore";
import { useUIStore } from "../stores/useUIStore";
import { ModalShell } from "./ui";

const inputClass =
  "w-full rounded-control border border-border-subtle bg-bg-surface-2 px-3 py-2 text-sm text-text-main placeholder:text-text-subtle transition-colors duration-200 ease-out focus:border-accent-primary focus:outline-none";

export function NewPlaylistModal() {
  const modal = useUIStore((s) => s.modal);
  const open = modal?.type === "newPlaylist";
  const closeModal = useUIStore((s) => s.closeModal);
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);
  const addToPlaylist = useLibraryStore((s) => s.addToPlaylist);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setError(null);
    }
  }, [open ]);

  if (!open) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Give your playlist a name.");
      return;
    }
    try {
      const playlist = await createPlaylist(name);
      // When opened from "Add to Playlist" on a media item, add it straight away.
      if (modal?.targetId) {
        await addToPlaylist(playlist.id, modal.targetId);
      }
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the playlist.");
    }
  };

  return (
    <ModalShell title="New playlist" onClose={closeModal}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="playlist-name" className="mb-1.5 block text-sm text-text-main">
            Playlist name
          </label>
          <input
            id="playlist-name"
            type="text"
            autoFocus
            data-autofocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Road trip mixes"
            maxLength={80}
            className={inputClass}
          />
        </div>
        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
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
            className="rounded-control bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-200 ease-out hover:bg-accent-hover"
          >
            Create
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function RenamePlaylistModal() {
  const modal = useUIStore((s) => s.modal);
  const open = modal?.type === "renamePlaylist";
  const closeModal = useUIStore((s) => s.closeModal);
  const playlists = useLibraryStore((s) => s.playlists);
  const renamePlaylist = useLibraryStore((s) => s.renamePlaylist);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const playlist = open && modal?.targetId
    ? playlists.find((p) => p.id === modal.targetId)
    : undefined;

  useEffect(() => {
    if (open) {
      setName(playlist?.name ?? "");
      setError(null);
    }
  }, [open, playlist?.name]);

  if (!open || !playlist) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Give your playlist a name.");
      return;
    }
    try {
      await renamePlaylist(playlist.id, name);
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename the playlist.");
    }
  };

  return (
    <ModalShell title="Rename playlist" onClose={closeModal}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="rename-playlist-name" className="mb-1.5 block text-sm text-text-main">
            Playlist name
          </label>
          <input
            id="rename-playlist-name"
            type="text"
            autoFocus
            data-autofocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className={inputClass}
          />
        </div>
        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
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
            className="rounded-control bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-200 ease-out hover:bg-accent-hover"
          >
            Rename
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
