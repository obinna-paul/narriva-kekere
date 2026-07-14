"use client"; import { useCallback, useEffect, useState } from "react";

interface Setting { key: string; value: string; description: string; }
interface Flag { key: string; enabled: boolean; description: string; }

// Mirrors ALLOWED_KEYS in src/app/api/admin/settings/[key]/route.ts — keep
// both lists in sync. Settings outside this list still display (read-only)
// so nothing silently disappears if a new PlatformSetting row shows up.
const EDITABLE_KEYS = new Set([
  "monthly_revenue_target_ngn",
  "writer_earnings_rate",
  "referral_reward_cowries",
  "tip_amount_cowries",
  "withdrawal_rate_ngn_per_cowrie",
  "minimum_withdrawal_cowries",
]);

export function SettingsView() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(d => {
      setSettings(d.settings ?? []);
      setFlags(d.featureFlags ?? []);
    }).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(type: "ok" | "err", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  async function save(key: string) {
    if (!editValue.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/settings/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: editValue.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Failed to save");
      setEditingKey(null);
      showToast("ok", "Setting saved.");
      load();
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-[34px] py-[30px] max-w-[1320px] flex gap-7">
      {toast && (
        <div className={`fixed right-6 top-6 z-50 rounded-[8px] px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg ${toast.type === "ok" ? "bg-[#1F8A5B]" : "bg-[#C0392B]"}`}>
          {toast.msg}
        </div>
      )}

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
                <div className={`w-[36px] h-[20px] rounded-full relative transition-colors ${f.enabled ? "bg-[#1F8A5B]" : "bg-[rgba(20,22,26,0.15)]"}`}>
                  <div className={`absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-all ${f.enabled ? "left-[18px]" : "left-[2px]"}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[11px] border border-[rgba(20,22,26,0.08)] bg-white px-5 py-5">
          <h3 className="text-[14px] font-semibold text-[#1A1C20] mb-4">Economy settings</h3>
          <div className="space-y-3">
            {settings.map((s) => {
              const editable = EDITABLE_KEYS.has(s.key);
              const isEditing = editingKey === s.key;
              return (
                <div key={s.key} className="flex items-center justify-between py-2 gap-4">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-[#1A1C20] capitalize">{s.key.replace(/_/g, " ")}</div>
                    <div className="text-[11px] text-[#8B919A]">{s.description}</div>
                  </div>
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-none">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                        className="w-[100px] rounded-[6px] border border-[rgba(20,22,26,0.14)] px-2 py-1 text-[13px] font-mono text-right focus:outline-none focus:ring-1 focus:ring-[#1A1C20]/30"
                      />
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => save(s.key)}
                        className="rounded-[6px] bg-[#1F8A5B] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#1a7a50] disabled:opacity-40"
                      >
                        {saving ? "…" : "Save"}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setEditingKey(null)}
                        className="rounded-[6px] border border-[rgba(20,22,26,0.14)] px-2.5 py-1 text-[11px] font-medium text-[#646B73] hover:bg-[#F4F5F7] disabled:opacity-40"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 flex-none">
                      <div className="text-[13px] font-semibold text-[#1A1C20] tabular-nums font-mono">{s.value}</div>
                      {editable && (
                        <button
                          type="button"
                          onClick={() => { setEditingKey(s.key); setEditValue(s.value); }}
                          className="rounded-[6px] border border-[rgba(20,22,26,0.14)] px-2.5 py-1 text-[11px] font-medium text-[#646B73] hover:bg-[#F4F5F7]"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
