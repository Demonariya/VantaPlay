/* Import button: opens a native file picker and feeds the chosen files
   to the library store. Also exports pickMediaFiles() so the app shell
   (e.g. keyboard shortcuts) can trigger the same picker. */
import { Plus } from "lucide-react";
import { useLibraryStore } from "../stores/useLibraryStore";
import { cn } from "../lib/cn";

const ACCEPT =
  "video/*,audio/*,.mkv,.avi,.mov,.wmv,.flv,.m2ts,.ts,.vob,.mpg,.mpeg,.m4v,.ogv,.3gp,.opus,.aiff";

export function pickMediaFiles(): void {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.accept = ACCEPT;
  input.onchange = () => {
    if (input.files && input.files.length > 0) {
      void useLibraryStore.getState().importFiles(input.files);
    }
  };
  input.click();
}

export function ImportButton({ variant = "primary" }: { variant?: "primary" | "ghost" }) {
  return (
    <button
      type="button"
      aria-label="Add media files to your library"
      onClick={pickMediaFiles}
      className={cn(
        "inline-flex items-center gap-2 rounded-control px-4 py-2 text-sm font-medium",
        "transition-colors duration-200 ease-out",
        variant === "primary"
          ? "bg-accent-primary text-white hover:bg-accent-hover"
          : "border border-border-subtle text-text-main hover:bg-bg-surface-1"
      )}
    >
      <Plus size={16} />
      Add media
    </button>
  );
}
