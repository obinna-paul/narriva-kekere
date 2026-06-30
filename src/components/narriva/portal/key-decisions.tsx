interface PinnedDecision {
  id: string;
  body: string;
  pinnedLabel: string;
  createdAt: string;
}

export function KeyDecisions({ decisions }: { decisions: PinnedDecision[] }) {
  if (decisions.length === 0) return null;

  return (
    <div className="mb-8 space-y-3">
      {decisions.map((d) => (
        <div key={d.id} className="flex items-start gap-3 rounded-[8px] border border-[#B08D57]/25 bg-[#B08D57]/[0.06] px-4 py-3.5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 flex-none"><path d="M3 8.5l3 3L13 5" stroke="#9A7B49" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div>
            <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#9A7B49]">{d.pinnedLabel}</span>
            <p className="mt-1 text-[14px] leading-[1.6] text-[#55514A]">{d.body}</p>
            <p className="mt-1 text-[11px] text-[#8A857C]">{new Date(d.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
