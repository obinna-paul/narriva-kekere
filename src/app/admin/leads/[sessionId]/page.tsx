import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({ params }: { params: { sessionId: string } }) {
  const messages = await prisma.nariConversation.findMany({
    where: { sessionId: params.sessionId },
    orderBy: { createdAt: "asc" },
  });

  if (messages.length === 0) notFound();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "32px", maxWidth: "680px", margin: "0 auto" }}>
      <Link href="/admin/leads" style={{ color: "#C75D2C", fontSize: "14px" }}>← Back to leads</Link>
      <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "16px 0 24px" }}>
        Session {params.sessionId.slice(0, 12)}…
      </h1>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              background: m.role === "user" ? "#f5f0e8" : "#fff",
              border: "1px solid #eee",
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "90%",
              marginLeft: m.role === "user" ? "auto" : "0",
            }}
          >
            <div style={{ fontSize: "11px", color: "#999", marginBottom: "4px", textTransform: "uppercase" }}>
              {m.role} · {m.createdAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              {m.classifiedLead && (
                <span style={{ marginLeft: "8px", padding: "1px 6px", borderRadius: "4px", background: "#fff0e0", color: "#C75D2C", fontWeight: 600 }}>
                  LEAD
                </span>
              )}
            </div>
            <div style={{ fontSize: "14px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.message}</div>
            {m.leadSummary && (
              <div style={{ marginTop: "8px", padding: "6px 10px", borderRadius: "6px", background: "#fff0e0", fontSize: "13px", color: "#C75D2C", fontWeight: 500 }}>
                🏷️ {m.leadSummary}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
