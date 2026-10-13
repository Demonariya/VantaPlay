/* App shell: sidebar + top bar + view region + global overlays. */

import { useEffect } from "react";
import { CloudUpload } from "lucide-react";
import { useLibraryStore } from "./stores/useLibraryStore";
import { usePlayerStore } from "./stores/usePlayerStore";
import { useUIStore } from "./stores/useUIStore";
import { useDragDropImport } from "./lib/import";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { CommandPalette } from "./components/CommandPalette";
import { ContextMenu } from "./components/ContextMenu";
import { SettingsModal } from "./components/settings/SettingsModal";
import { PropertiesModal } from "./components/PropertiesModal";
import { AddStreamModal } from "./components/AddStreamModal";
import { ConvertDialog } from "./components/ConvertDialog";
import { NewPlaylistModal, RenamePlaylistModal } from "./components/PlaylistModals";
import { HomeView } from "./views/HomeView";
import { LibraryView } from "./views/LibraryView";
import { PlaylistsView } from "./views/PlaylistsView";
import { StreamsView } from "./views/StreamsView";
import { PlayerView } from "./views/PlayerView";

export default function App() {
  const view = useUIStore((s) => s.view);
  const playerOpen = usePlayerStore((s) => s.playerOpen);
  const { isDragging, dragHandlers } = useDragDropImport();

  useKeyboardShortcuts();

  useEffect(() => {
    void useLibraryStore.getState().load();
  }, []);

  return (
    <div className="flex h-full bg-bg-primary text-text-main">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main
          {...dragHandlers}
          className="relative min-h-0 flex-1 overflow-y-auto"
        >
          {view === "home" && <HomeView />}
          {view === "library" && <LibraryView />}
          {view === "playlists" && <PlaylistsView />}
          {view === "streams" && <StreamsView />}
          {isDragging && (
            <div className="anim-fade-in pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-bg-primary/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2 rounded-container border-2 border-dashed border-accent-primary bg-bg-surface-1 px-12 py-10">
                <CloudUpload
                  size={40}
                  aria-hidden="true"
                  className="text-accent-primary"
                />
                <p className="text-lg font-semibold text-text-main">
                  Drop files to add to your library
                </p>
                <p className="text-sm text-text-muted">
                  Video and audio files are supported
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {playerOpen && <PlayerView />}
      <CommandPalette />
      <ContextMenu />
      <SettingsModal />
      <PropertiesModal />
      <AddStreamModal />
      <ConvertDialog />
      <NewPlaylistModal />
      <RenamePlaylistModal />
    </div>
  );
}
