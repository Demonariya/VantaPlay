/* Brand lockup for the sidebar. Decorative cone + wordmark. */

export function BrandMark({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex min-w-0 items-center">
      <span aria-hidden="true" className="flex items-center gap-2.5">
        <img src="/cone.svg" alt="" draggable={false} className="h-8 w-8 shrink-0" />
        {!collapsed && (
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-bold tracking-tight text-text-main">VLC</span>
            <span className="mt-1 text-[9px] font-semibold tracking-[0.22em] text-text-subtle">
              REDESIGNED
            </span>
          </span>
        )}
      </span>
      <span className="sr-only">VLC Redesigned</span>
    </div>
  );
}
