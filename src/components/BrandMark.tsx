/* VantaPlay wordmark. The cone artwork remains an original asset from the upstream MIT project. */
export function BrandMark({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex min-w-0 items-center" aria-label="VantaPlay">
      <span aria-hidden="true" className="flex items-center gap-2.5">
        <img src="/cone.svg" alt="" draggable={false} className="h-8 w-8 shrink-0" />
        {!collapsed && (
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-bold tracking-tight text-text-main">VantaPlay</span>
            <span className="mt-1 text-[9px] font-semibold tracking-[0.22em] text-text-subtle">
              MEDIA PLAYER
            </span>
          </span>
        )}
      </span>
      <span className="sr-only">VantaPlay media player</span>
    </div>
  );
}
