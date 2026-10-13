import { useMemo } from "react";
import { Search } from "lucide-react";
import { useLibraryStore } from "../stores/useLibraryStore";
import { useUIStore } from "../stores/useUIStore";
import { searchItems, sortItems } from "../lib/selectors";
import type { LibrarySort } from "../types";
import { MediaList } from "../components/MediaList";
import { ImportButton } from "../components/ImportButton";
import { EmptyState, SectionTitle, Select } from "../components/ui";

export function LibraryView() {
  const items = useLibraryStore((s) => s.items);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const librarySort = useUIStore((s) => s.librarySort);
  const setLibrarySort = useUIStore((s) => s.setLibrarySort);

  const visible = useMemo(
    () => sortItems(searchItems(items, searchQuery), librarySort),
    [items, searchQuery, librarySort]
  );

  return (
    <div className="space-y-4">
      <SectionTitle
        action={
          <div className="w-48">
            <Select
              label="Sort library"
              value={librarySort}
              onChange={(v) => setLibrarySort(v as LibrarySort)}
              options={[
                { value: "recent", label: "Recently played" },
                { value: "name", label: "Name" },
                { value: "duration", label: "Duration" },
                { value: "added", label: "Date added" },
              ]}
            />
          </div>
        }
      >
        Library
      </SectionTitle>

      <p className="text-sm text-text-muted" aria-live="polite">
        {visible.length} {visible.length === 1 ? "item" : "items"}
        {searchQuery.trim() && ` matching "${searchQuery.trim()}"`}
      </p>

      {visible.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          hint={
            items.length === 0
              ? "Your library is empty. Add media files to get started."
              : "No media matches your search. Try a different term."
          }
          action={items.length === 0 ? <ImportButton variant="primary" /> : undefined}
        />
      ) : (
        <MediaList items={visible} />
      )}
    </div>
  );
}
