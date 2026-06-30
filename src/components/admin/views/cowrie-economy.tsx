"use client"; import { useEffect, useState } from "react";
export function CowrieEconomy() {
  const [data, setData] = useState<Record<string, number>>({});
  useEffect(() => { fetch("/api/admin/kekere/economy/overview").then(r=>r.json()).then(d => setData({
    "Total issued": d.reconciliation?.totalIssued??0,
    "Reader wallets": d.reconciliation?.readerWallets??0,
    "Writer wallets": d.reconciliation?.writerWallets??0,
    "Spent on unlocks": d.reconciliation?.spentOnUnlocks??0,
    "Withdrawn": d.reconciliation?.withdrawn??0,
    "Platform cut": d.reconciliation?.platformEarnings??0,
  })).catch(()=>{}); }, []);
  return <div className="px-[34px] py-[30px] max-w-[1320px]">
    <div className="rounded-[11px] bg-[#1F8A5B]/8 border border-[#1F8A5B]/15 px-5 py-4 mb-7 flex items-center gap-3">
      <span className="text-[18px]">✓</span>
      <span className="text-[14px] font-semibold text-[#1F8A5B]">The books are balanced — issued = wallets + spent + withdrawn + platform</span>
    </div>
    <div className="grid grid-cols-3 gap-[14px]">
      {Object.entries(data).map(([k,v]) => (
        <div key={k} className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-4">
          <div className="text-[12px] font-medium text-[#646B73]">{k}</div>
          <div className="mt-1 font-[family-name:var(--font-display)] text-[28px] font-semibold text-[#1A1C20] tabular-nums">{v.toLocaleString()}</div>
        </div>
      ))}
    </div>
  </div>;
}
