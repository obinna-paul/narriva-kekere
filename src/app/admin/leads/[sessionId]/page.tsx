import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type MessageEntry = { role: string; content: string; timestamp?: string };

export default async function SessionDetailPage({ params }: { params: { sessionId: string } }) {
  const convo = await prisma.nariConversation.findUnique({
    where: { sessionId: params.sessionId },
    include: { intel: true },
  });

  if (!convo) notFound();

  const messages = (convo.messages as MessageEntry[]) ?? [];

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "32px", maxWidth: "680px", margin: "0 auto" }}>
      <Link href="/admin/leads" style={{ color: "#C75D2C", fontSize: "14px" }}>← Back to leads</Link>
      <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "16px 0 4px" }}>
        Session {params.sessionId.slice(0, 12)}…
      </h1>
      <p style={{ fontSize: "13px", color: "#999", margin: "0 0 24px" }}>
        Started {convo.startedAt.toLocaleString()}
        {convo.durationSecs != null && ` · ${Math.round(convo.durationSecs / 60)}m`}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {messages.map((m, i) => (
          <div
            key={i}
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
              {m.role}{m.timestamp ? ` · ${new Date(m.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : ""}
            </div>
            <div style={{ fontSize: "14px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
