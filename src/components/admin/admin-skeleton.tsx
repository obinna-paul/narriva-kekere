import { cn } from "@/lib/utils/cn";

function Pulse({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-[rgba(20,22,26,0.07)]", className)} />;
}

export function SkeletonKpiCard() {
  return (
    <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white p-[18px_19px_17px]">
      <Pulse className="mb-3 h-3 w-32" />
      <Pulse className="h-8 w-24" />
      <Pulse className="mt-3 h-3 w-40" />
    </div>
  );
}

export function SkeletonCard({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white p-5", className)}>
      <Pulse className="mb-3 h-4 w-48" />
      {Array.from({ length: rows }).map((_, i) => (
        <Pulse key={i} className="mb-2 h-3 w-full" />
      ))}
    </div>
  );
}

export function SkeletonTableRow({ cols = 6 }: { cols?: number }) {
  return (
    <div
      className="grid items-center gap-3.5 border-b border-[rgba(20,22,26,0.05)] px-5 py-3.5"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <Pulse key={i} className={cn("h-3", i === 0 ? "w-full" : "w-3/4")} />
      ))}
    </div>
  );
}

export function SkeletonTableShell({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white">
      <div
        className="grid gap-3.5 border-b border-[rgba(20,22,26,0.08)] bg-[#FBFBFC] px-5 py-3"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Pulse key={i} className="h-2.5 w-20" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} cols={cols} />
      ))}
    </div>
  );
}

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white p-5", className)}>
      <Pulse className="mb-1 h-4 w-40" />
      <Pulse className="mb-4 h-3 w-56" />
      <div className="flex h-40 items-end gap-1">
        {Array.from({ length: 20 }).map((_, i) => (
          <Pulse
            key={i}
            className="flex-1 rounded-none rounded-t"
            style={{ height: `${30 + Math.random() * 70}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function AdminViewError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-8 py-16 text-center">
      <div className="mb-3 text-3xl">⚠️</div>
      <p className="text-sm font-semibold text-[#1A1C20]">Something went wrong</p>
      <p className="mt-1 text-xs text-[#9AA0A8]">{message ?? "Failed to load data."}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-[8px] bg-[#1A1C20] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2D3139]"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function AdminEmptyState({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-8 py-16 text-center">
      <div className="mb-4 flex h-[54px] w-[54px] items-center justify-center rounded-[13px] bg-[#F4F5F7]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9AA0A8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      </div>
      <p className="font-[family-name:var(--font-display)] text-[21px] font-semibold text-[#1A1C20]">{title}</p>
      {note && <p className="mx-auto mt-2 max-w-[380px] text-sm leading-relaxed text-[#8B919A]">{note}</p>}
    </div>
  );
}
