"use client"; export function BookSalesView() {
  return <div className="px-[34px] py-[30px] max-w-[1320px]">
    <div className="grid grid-cols-4 gap-[14px] mb-7">
      {["Revenue", "Copies sold", "Avg price", "Titles live"].map((label, i) => (
        <div key={label} className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-4">
          <div className="text-[12px] font-medium text-[#646B73]">{label}</div>
          <div className="mt-1 font-[family-name:var(--font-display)] text-[28px] font-semibold text-[#1A1C20]">{["₦1.84M","612","₦3,010","34"][i]}</div>
        </div>
      ))}
    </div>
    <p className="text-[14px] text-[#8B919A] text-center py-10">Connect the Book Sales API to populate real data.</p>
  </div>;
}
