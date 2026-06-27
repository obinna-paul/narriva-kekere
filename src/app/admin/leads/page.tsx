import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const conversations = await prisma.nariConversation.findMany({
    where: { role: "user" },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const leads = await prisma.nariConversation.findMany({
    where: { classifiedLead: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const sessions = new Map<string, { first: Date; messages: number; hasLead: boolean }>();

  for (const c of conversations) {
    const existing = sessions.get(c.sessionId);
    sessions.set(c.sessionId, {
      first: existing ? existing.first : c.createdAt,
      messages: (existing?.messages ?? 0) + 1,
      hasLead: existing?.hasLead ?? false,
    });
  }

  for (const l of leads) {
    const existing = sessions.get(l.sessionId);
    if (existing) existing.hasLead = true;
  }

  const sessionList = Array.from(sessions.entries())
    .sort((a, b) => b[1].first.getTime() - a[1].first.getTime());

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "32px", maxWidth: "960px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>Nari Leads</h1>
      <p style={{ color: "#666", marginBottom: "32px", fontSize: "14px" }}>
        {leads.length} leads · {sessionList.length} conversations
      </p>

      {leads.length > 0 && (
        <>
          <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px", color: "#C75D2C" }}>
            🏷️ Flagged Leads
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "32px", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee" }}>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>Session</th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>What they want</th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "12px" }}>
                    <a href={`/admin/leads/${lead.sessionId}`} style={{ color: "#C75D2C" }}>
                      {lead.sessionId.slice(0, 8)}…
                    </a>
                  </td>
                  <td style={{ padding: "10px 12px", fontWeight: 500 }}>{lead.leadSummary}</td>
                  <td style={{ padding: "10px 12px", color: "#888", whiteSpace: "nowrap" }}>
                    {lead.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>
        All Conversations
      </h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #eee" }}>
            <th style={{ textAlign: "left", padding: "8px 12px" }}>Session</th>
            <th style={{ textAlign: "left", padding: "8px 12px" }}>Msgs</th>
            <th style={{ textAlign: "left", padding: "8px 12px" }}>Lead?</th>
            <th style={{ textAlign: "left", padding: "8px 12px" }}>Started</th>
          </tr>
        </thead>
        <tbody>
          {sessionList.map(([sid, info]) => (
            <tr key={sid} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "12px" }}>
                <a href={`/admin/leads/${sid}`} style={{ color: "#333" }}>
                  {sid.slice(0, 12)}…
                </a>
              </td>
              <td style={{ padding: "10px 12px" }}>{info.messages}</td>
              <td style={{ padding: "10px 12px" }}>
                {info.hasLead ? <span style={{ color: "#C75D2C", fontWeight: 600 }}>Yes</span> : "—"}
              </td>
              <td style={{ padding: "10px 12px", color: "#888", whiteSpace: "nowrap" }}>
                {info.first.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
