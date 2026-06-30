interface BookInfoProps {
  isPublished: boolean;
  coverImageRef?: string | null;
  title: string;
  isbn?: string | null;
  expectedPubDate?: string | null;
  totalSales?: number;
}

export function BookInfoTab({ isPublished, coverImageRef, title, isbn, expectedPubDate, totalSales }: BookInfoProps) {
  if (!isPublished) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[rgba(22,22,22,0.06)]">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="5" y="3" width="18" height="22" rx="2" stroke="#8A857C" strokeWidth="1.5"/><circle cx="14" cy="15" r="3" stroke="#8A857C" strokeWidth="1.5"/><path d="M9 18l-2 2v5h14v-5l-2-2" stroke="#8A857C" strokeWidth="1.5"/></svg>
        </div>
        <h3 className="mt-5 font-[family-name:var(--font-display)] text-[18px] font-semibold text-[#161616]">Book info unlocks at launch</h3>
        <p className="mt-2 max-w-[320px] text-[14px] leading-[1.6] text-[#55514A]">
          Your final cover, ISBN, publication date, bookstore link, and sales figures will appear here once your book goes live in the Narriva bookstore.
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-full bg-[rgba(22,22,22,0.06)] px-4 py-2 text-[13px] font-medium text-[#8A857C]">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="7" width="10" height="5" rx="1.5" stroke="#8A857C" strokeWidth="1.2"/><path d="M4 7V5a3 3 0 116 0v2" stroke="#8A857C" strokeWidth="1.2"/></svg>
          Current stage: Preparation
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[240px_1fr]">
      {/* Cover */}
      <div className="rounded-[8px] overflow-hidden aspect-[2/3] bg-gradient-to-b from-[#1E3A8A]/20 to-[#1E3A8A]/40 flex items-center justify-center">
        {coverImageRef ? (
          <img src={coverImageRef} alt={title} className="w-full h-full object-cover" />
        ) : (
          <span className="font-[family-name:var(--font-display)] text-[18px] font-semibold text-[#1E3A8A]/60 text-center px-4">{title}</span>
        )}
      </div>

      {/* Info */}
      <div className="space-y-5">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-[24px] font-semibold text-[#161616]">{title}</h2>
          {isbn && <p className="mt-1 text-[14px] text-[#8A857C] font-mono">ISBN: {isbn}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-[8px] border border-[rgba(22,22,22,0.10)] px-4 py-3.5">
            <div className="text-[12px] text-[#8A857C]">Publication date</div>
            <div className="mt-1 font-[family-name:var(--font-display)] text-[18px] font-semibold text-[#161616]">
              {expectedPubDate ? new Date(expectedPubDate).toLocaleDateString() : "—"}
            </div>
          </div>
          <div className="rounded-[8px] border border-[rgba(22,22,22,0.10)] px-4 py-3.5">
            <div className="text-[12px] text-[#8A857C]">Total copies sold</div>
            <div className="mt-1 font-[family-name:var(--font-display)] text-[18px] font-semibold text-[#161616]">
              {totalSales?.toLocaleString() ?? "0"}
            </div>
          </div>
        </div>

        <a
          href="/narriva/bookstore"
          className="inline-flex items-center gap-2 rounded-[8px] bg-[#1E3A8A] px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          View in bookstore
        </a>
      </div>
    </div>
  );
}
