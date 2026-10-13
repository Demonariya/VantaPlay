/* Floating menu panel anchored to a control. Positioned fixed above the
   anchor, closes on outside mousedown (capture) and Escape. */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { useUIStore } from "../../stores/useUIStore";

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  align?: "left" | "right";
}

export function Popover({ open, onClose, anchorRef, children, align = "left" }: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });

  // Position above the anchor once open (anchor must be measured).
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const bottom = window.innerHeight - r.top + 8;
      setStyle(
        align === "right"
          ? { bottom, right: Math.max(8, window.innerWidth - r.right), visibility: "visible" }
          : { bottom, left: Math.max(8, r.left), visibility: "visible" }
      );
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, anchorRef, align]);

  // Dismiss on outside mousedown (capture phase) and Escape.
  useEffect(() => {
    if (!open) return;
    // Announce to the global Esc handler so it unwinds the popover first
    // instead of closing the whole player.
    useUIStore.getState().setPopoverOpen(true);
    return () => useUIStore.getState().setPopoverOpen(false);
  }, [open ]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (panelRef.current?.contains(target)) return;
      // The anchor toggles itself; let its click handler do the work.
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="menu"
      style={{ position: "fixed", zIndex: 50, ...style }}
      className="anim-pop-in min-w-48 rounded-card border border-border-subtle bg-bg-surface-1 shadow-pop"
    >
      {children}
    </div>
  );
}
