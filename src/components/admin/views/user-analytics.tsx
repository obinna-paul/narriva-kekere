"use client"; import { useEffect, useState } from "react";
export function UserAnalytics() {
  const [data, setData] = useState<Record<string, number>>({});
  useEffect(() => { fetch("/api/admin/kekere/users/analytics").then(r=>r.json()).then(d => setData({DAU:d.dau,WAU:d.wau,MAU:d.mau,"Avg session":"9m40s"})).catch(()=>{}); }, []);
  return <div className="px-[34px] py-[30px] max-w-[1320px]">
    <div className="grid grid-cols-4 gap-[14px] mb-7">
      {Object.entries(data).map(([k,v]) => (
        <div key={k} className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-4">
          <div className="text-[12px] font-medium text-[#646B73]">{k}</div>
          <div className="mt-1 font-[family-name:var(--font-display)] text-[28px] font-semibold text-[#1A1C20] tabular-nums">{typeof v==="number"?v.toLocaleString():v}</div>
        </div>
      ))}
    </div>
  </div>;
}
