import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getAdminOverview } from "@/lib/data/admin-analytics";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const stats = await getAdminOverview();
  const recentLeads = await prisma.nariConversation.findMany({
    where: { classifiedLead: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "32px", maxWidth: "1100px", margin: "0 auto", background: "#f8f6f3", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>Dashboard</h1>
      <p style={{ color: "#888", fontSize: "14px", marginBottom: "32px" }}>Narriva admin</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px", marginBottom: "40px" }}>
        {[
          { label: "Users", value: stats.totalUsers, color: "#1F4B4B" },
          { label: "Leads", value: stats.totalLeads, color: "#C75D2C" },
          { label: "Projects", value: stats.totalProjects, color: "#1F6F4A" },
          { label: "Books", value: stats.totalBooks, color: "#5A3A2A" },
          { label: "New signups (7d)", value: stats.signups7d, color: "#8B5E3C" },
          { label: "Revenue (30d)", value: `₦${stats.revenue30d.toLocaleString()}`, color: "#2E6A5E" },
          { label: "Sales (30d)", value: stats.salesCount30d, color: "#3A5A4A" },
        ].map((stat) => (
          <div key={stat.label} style={{ background: "#fff", borderRadius: "12px", border: "1px solid #eee", padding: "20px" }}>
            <p style={{ fontSize: "12px", color: "#888", textTransform: "uppercase", marginBottom: "4px" }}>{stat.label}</p>
            <p style={{ fontSize: "28px", fontWeight: 700, color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
        <div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
            <Link href="/admin/projects" style={{ padding: "8px 20px", borderRadius: "8px", background: "#C75D2C", color: "#fff", fontWeight: 600, textDecoration: "none", fontSize: "14px" }}>Projects</Link>
            <Link href="/admin/leads" style={{ padding: "8px 20px", borderRadius: "8px", border: "1px solid #ddd", color: "#333", fontWeight: 600, textDecoration: "none", fontSize: "14px" }}>Leads</Link>
            <Link href="/admin/sales" style={{ padding: "8px 20px", borderRadius: "8px", border: "1px solid #ddd", color: "#333", fontWeight: 600, textDecoration: "none", fontSize: "14px" }}>Sales</Link>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #eee", padding: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Recent Leads</h2>
          {recentLeads.length === 0 ? (
            <p style={{ color: "#999", fontSize: "14px" }}>No leads yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {recentLeads.map((lead) => (
                <div key={lead.id} style={{ fontSize: "13px" }}>
                  <p style={{ fontWeight: 500 }}>{lead.leadSummary || "No summary"}</p>
                  <p style={{ color: "#999", fontSize: "11px" }}>
                    {lead.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
