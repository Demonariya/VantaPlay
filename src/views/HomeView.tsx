import { Clapperboard, ListMusic } from "lucide-react";
import { useLibraryStore } from "../stores/useLibraryStore";
import { useUIStore } from "../stores/useUIStore";
import { selectContinueWatching, selectRecent } from "../lib/selectors";
import { MediaCard } from "../components/MediaCard";
import { MediaList } from "../components/MediaList";
import { ImportButton } from "../components/ImportButton";
import { EmptyState, SectionTitle } from "../components/ui";

export function HomeView() {
  const items = useLibraryStore((s) => s.items);
  const playlists = useLibraryStore((s) => s.playlists);
  const setView = useUIStore((s) => s.setView);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Clapperboard}
        title="Your library is empty"
        hint="Add video or audio files to start building your collection. Everything stays on this device."
        action={<ImportButton variant="primary" />}
      />
    );
  }

  const continueWatching = selectContinueWatching(items);
  const recent = selectRecent(items);
  const continueQueue = continueWatching.map((i) => i.id);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-text-main">Your library</h1>
        <p className="mt-1 text-sm text-text-muted">
          {items.length} {items.length === 1 ? "item" : "items"} in your collection
        </p>
      </header>

      {continueWatching.length > 0 && (
        <section aria-label="Continue watching">
          <SectionTitle>Continue watching</SectionTitle>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {continueWatching.map((item) => (
              <div key={item.id} className="w-64 shrink-0">
                <MediaCard item={item} queue={continueQueue} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Recently added">
        <SectionTitle>Recently added</SectionTitle>
        <MediaList items={recent} />
      </section>

      {playlists.length > 0 && (
        <section aria-label="Playlists">
          <SectionTitle
            action={
              <button
                type="button"
                onClick={() => setView("playlists")}
                className="text-sm font-medium text-accent-primary transition-colors duration-200 ease-out hover:text-accent-hover"
              >
                View all
              </button>
            }
          >
            Playlists
          </SectionTitle>
          <div className="flex flex-wrap gap-2">
            {playlists.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setView("playlists")}
                aria-label={`Open playlist ${p.name}`}
                className="inline-flex items-center gap-2 rounded-pill border border-border-subtle bg-bg-surface-1 px-4 py-2 text-sm text-text-main transition-colors duration-200 ease-out hover:border-border-strong hover:bg-bg-surface-2"
              >
                <ListMusic size={16} className="text-text-muted" />
                {p.name}
                <span className="text-xs tabular-nums text-text-subtle">{p.itemIds.length}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
