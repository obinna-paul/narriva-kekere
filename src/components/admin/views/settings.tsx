"use client"; import { useEffect, useState } from "react";

interface Setting { key: string; value: string; description: string; }
interface Flag { key: string; enabled: boolean; description: string; }

export function SettingsView() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(d => {
      setSettings(d.settings ?? []);
      setFlags(d.featureFlags ?? []);
    }).catch(() => {});
  }, []);

  return (
    <div className="px-[34px] py-[30px] max-w-[1320px] flex gap-7">
      <div className="w-[200px] flex-none space-y-[2px]">
        {["Economy","Feature flags","Admin accounts","Nari FAQ"].map((t) => (
          <button key={t} className="block w-full text-left px-3 py-2 rounded-[7px] text-[13px] font-medium text-[#8B919A] hover:bg-[rgba(20,22,26,0.04)] hover:text-[#1A1C20]">{t}</button>
        ))}
      </div>

      <div className="flex-1 space-y-7">
        <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5">
          <h3 className="text-[14px] font-semibold text-[#1A1C20] mb-4">Feature flags</h3>
          <div className="space-y-3">
            {flags.map((f) => (
              <div key={f.key} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-[13px] font-medium text-[#1A1C20]">{f.key}</div>
                  <div className="text-[11px] text-[#8B919A]">{f.description || "No description"}</div>
                </div>
                <div className={`w-[36px] h-[20px] rounded-full relative cursor-pointer transition-colors ${f.enabled ? "bg-[#1F8A5B]" : "bg-[rgba(20,22,26,0.15)]"}`}>
                  <div className={`absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-all ${f.enabled ? "left-[18px]" : "left-[2px]"}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5">
          <h3 className="text-[14px] font-semibold text-[#1A1C20] mb-4">Economy settings</h3>
          <div className="space-y-3">
            {settings.map((s) => (
              <div key={s.key} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-[13px] font-medium text-[#1A1C20]">{s.key.replace(/_/g, " ")}</div>
                  <div className="text-[11px] text-[#8B919A]">{s.description}</div>
                </div>
                <div className="text-[13px] font-semibold text-[#1A1C20] tabular-nums font-mono">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
