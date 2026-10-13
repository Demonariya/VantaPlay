/* Media file intake: file-picker dialog + drag-and-drop hook. */

import { useRef, useState, type DragEvent } from "react";
import { useLibraryStore } from "../stores/useLibraryStore";

const ACCEPT =
  "video/*,audio/*,.mkv,.avi,.flac,.ogg,.opus,.m4a,.mp3,.mp4,.webm,.mov";

/** Open the native file picker and import the chosen media files. */
export function pickMediaFiles(): void {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.accept = ACCEPT;
  input.onchange = () => {
    if (input.files && input.files.length > 0) {
      void useLibraryStore.getState().importFiles(input.files);
    }
    input.remove();
  };
  input.click();
}

interface DragHandlers {
  onDragEnter: (e: DragEvent<HTMLElement>) => void;
  onDragOver: (e: DragEvent<HTMLElement>) => void;
  onDragLeave: (e: DragEvent<HTMLElement>) => void;
  onDrop: (e: DragEvent<HTMLElement>) => void;
}

/**
 * Drag-and-drop file import. Spread `dragHandlers` onto the drop zone
 * element; render your own overlay while `isDragging` is true.
 */
export function useDragDropImport(): {
  isDragging: boolean;
  dragHandlers: DragHandlers;
} {
  const [isDragging, setIsDragging] = useState(false);
  // Depth counter so dragenter/dragleave pairs on children don't flicker.
  const depth = useRef(0);

  const hasFiles = (e: DragEvent<HTMLElement>) =>
    Array.from(e.dataTransfer.types).includes("Files");

  const dragHandlers: DragHandlers = {
    onDragEnter: (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current += 1;
      setIsDragging(true);
    },
    onDragOver: (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setIsDragging(false);
    },
    onDrop: (e) => {
      e.preventDefault();
      depth.current = 0;
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        void useLibraryStore.getState().importFiles(files);
      }
    },
  };

  return { isDragging, dragHandlers };
}
