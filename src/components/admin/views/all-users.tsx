"use client"; export function AllUsers() {
  return <div className="px-[34px] py-[30px] max-w-[1320px]">
    <div className="flex gap-2 mb-5">
      {["All","Reader","Writer","Author","Admin"].map(r => <button key={r} className="px-4 py-1.5 rounded-[20px] text-[12px] font-medium bg-[rgba(20,22,26,0.06)] text-[#646B73] hover:bg-[rgba(20,22,26,0.10)]">{r}</button>)}
    </div>
    <p className="text-[14px] text-[#8B919A] text-center py-10">All Users table — wire to admin users API with role filter, search, suspend, impersonate actions.</p>
  </div>;
}
