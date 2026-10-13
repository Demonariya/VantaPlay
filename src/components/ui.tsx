/* Shared primitives. Every component in the app builds on these —
   no one-off buttons, toggles or modal shells elsewhere. */
import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";

/* ------------------------------ IconButton ------------------------------ */
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  size?: "sm" | "md" | "lg";
}
export function IconButton({ icon: Icon, label, active, size = "md", className, ...rest }: IconButtonProps) {
  const dims = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-12 w-12" }[size];
  const iconDims = { sm: 16, md: 20, lg: 24 }[size];
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-control",
        "text-text-muted transition-all duration-200 ease-out",
        "hover:bg-bg-surface-2 hover:text-text-main",
        "active:scale-95 disabled:opacity-40 disabled:pointer-events-none",
        active && "bg-accent-soft text-accent-primary hover:text-accent-hover",
        dims,
        className
      )}
      {...rest}
    >
      <Icon size={iconDims} strokeWidth={2} />
    </button>
  );
}

/* -------------------------------- Toggle -------------------------------- */
interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}
export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <label htmlFor={id} className="text-sm text-text-main cursor-pointer">
          {label}
        </label>
        {description && <p className="text-xs text-text-subtle mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-pill transition-colors duration-200",
          checked ? "bg-accent-primary" : "bg-bg-surface-2 border border-border-subtle"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ease-out",
            checked ? "left-[22px]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}

/* -------------------------------- Select -------------------------------- */
interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
  description?: string;
}
export function Select({ value, onChange, options, label, description }: SelectProps) {
  const id = useId();
  return (
    <div className="py-2">
      <label htmlFor={id} className="text-sm text-text-main">
        {label}
      </label>
      {description && <p className="text-xs text-text-subtle mt-0.5 mb-1.5">{description}</p>}
      <div className="relative mt-1.5">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full appearance-none rounded-control border border-border-subtle",
            "bg-bg-surface-1 px-3 py-2 pr-9 text-sm text-text-main",
            "transition-colors duration-200 hover:border-border-strong"
          )}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-bg-surface-1">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-subtle"
        />
      </div>
    </div>
  );
}

/* -------------------------------- Stepper ------------------------------- */
interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  label: string;
  description?: string;
}
export function Stepper({ value, onChange, min, max, step, unit, label, description }: StepperProps) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <span className="text-sm text-text-main">{label}</span>
        {description && <p className="text-xs text-text-subtle mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-1 rounded-control border border-border-subtle bg-bg-surface-1 p-1">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(clamp(value - step))}
          disabled={value <= min}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-surface-2 hover:text-text-main disabled:opacity-30"
        >
          <Minus size={14} />
        </button>
        <span className="min-w-16 text-center text-sm tabular-nums text-text-main" aria-live="polite">
          {value}
          {unit && <span className="text-text-subtle"> {unit}</span>}
        </span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(clamp(value + step))}
          disabled={value >= max}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-surface-2 hover:text-text-main disabled:opacity-30"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

/* --------------------------------- Slider -------------------------------- */
interface SliderProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
}
export function Slider({ value, onChange, min = 0, max = 100, step = 1, label }: SliderProps) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="vlc-slider w-full"
      />
    </label>
  );
}

/* ------------------------------- ModalShell ------------------------------ */
interface ModalShellProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}
export function ModalShell({ title, onClose, children, wide }: ModalShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        // Minimal focus trap.
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "anim-pop-in max-h-[85vh] w-full overflow-hidden rounded-container",
          "border border-border-subtle bg-bg-surface-1 shadow-pop outline-none",
          wide ? "max-w-3xl" : "max-w-lg"
        )}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-text-main">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-8 w-8 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-bg-surface-2 hover:text-text-main"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------- EmptyState ------------------------------ */
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  hint: string;
  action?: ReactNode;
}
export function EmptyState({ icon: Icon, title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-container bg-bg-surface-1 border border-border-subtle">
        <Icon size={28} className="text-text-subtle" />
      </div>
      <h3 className="text-lg font-semibold text-text-main">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-text-muted">{hint}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ------------------------------ SectionTitle ----------------------------- */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-semibold text-text-main">{children}</h2>
      {action}
    </div>
  );
}

/* ---------------------------------- Badge --------------------------------- */
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-bg-surface-2 border border-border-subtle px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
      {children}
    </span>
  );
}
