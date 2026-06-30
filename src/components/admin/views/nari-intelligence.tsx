"use client"; import { useEffect, useState } from "react";
export function NariIntelligence() {
  const [summary, setSummary] = useState<Record<string, number>>({});
  useEffect(() => { fetch("/api/admin/nari/pipeline/summary").then(r=>r.json()).then(s => setSummary({
    Conversations: s.totalConversationsThisWeek??0,
    "High intent": s.highIntentThisWeek??0,
    "Leads created": s.leadsCreatedThisMonth??0,
    "Conversion": s.conversionRate??0,
  })).catch(()=>{}); }, []);
  return <div className="px-[34px] py-[30px] max-w-[1320px]">
    <div className="grid grid-cols-4 gap-[14px] mb-7">
      {Object.entries(summary).map(([k,v]) => (
        <div key={k} className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-4">
          <div className="text-[12px] font-medium text-[#646B73]">{k}</div>
          <div className="mt-1 font-[family-name:var(--font-display)] text-[28px] font-semibold text-[#1A1C20]">{k==="Conversion"?`${v}%`:v.toLocaleString()}</div>
        </div>
      ))}
    </div>
    <p className="text-[14px] text-[#8B919A] text-center py-10">Feed + Pipeline — connect conversations API.</p>
  </div>;
}
