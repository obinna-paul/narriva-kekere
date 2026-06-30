import { Download } from "lucide-react";

interface DocumentItem {
  id: string;
  label: string;
  fileType: string;
  uploadedAt: string;
  downloadUrl: string;
}

export function DocumentsList({ documents }: { documents: DocumentItem[] }) {
  if (documents.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[15px] text-[#8A857C]">No documents yet.</p>
        <p className="mt-1 text-[13px] text-[#8A857C]/70">Formal documents like your publishing agreement will appear here as prepared by the team.</p>
      </div>
    );
  }

  return (
    <div className="space-y-[10px]">
      {documents.map((d) => (
        <div key={d.id} className="flex items-center gap-4 rounded-[8px] border border-[rgba(22,22,22,0.10)] bg-white px-4 py-4">
          <div className="flex h-[44px] w-[44px] flex-none items-center justify-center rounded-[6px] bg-[rgba(22,22,22,0.06)]">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 2h7l4 4v11a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#55514A" strokeWidth="1.5"/><path d="M12 2v4h4" stroke="#55514A" strokeWidth="1.5"/></svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-medium text-[#161616]">{d.label}</div>
            <div className="text-[12px] text-[#8A857C]">{d.fileType} · {new Date(d.uploadedAt).toLocaleDateString()}</div>
          </div>
          <a
            href={d.downloadUrl}
            className="flex-none rounded-[8px] border border-[#1E3A8A] px-4 py-2 text-[13px] font-semibold text-[#1E3A8A] transition-colors hover:bg-[#1E3A8A]/5"
          >
            <Download size={14} className="inline mr-1.5" />Download
          </a>
        </div>
      ))}
    </div>
  );
}
