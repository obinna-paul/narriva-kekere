import Link from "next/link";
import { getSalesData } from "@/lib/data/admin-analytics";

export const dynamic = "force-dynamic";

export default async function AdminSalesPage() {
  const sales = await getSalesData(90);
  const total = sales.reduce((sum, s) => sum + s.amountNgn, 0);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "32px", maxWidth: "1100px", margin: "0 auto", background: "#f8f6f3", minHeight: "100vh" }}>
      <Link href="/admin" style={{ color: "#C75D2C", fontSize: "14px" }}>← Dashboard</Link>
      <h1 style={{ fontSize: "24px", fontWeight: 700, margin: "16px 0 4px" }}>Sales</h1>
      <p style={{ color: "#888", fontSize: "14px", marginBottom: "24px" }}>
        Last 90 days · ₦{total.toLocaleString()} total
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden", border: "1px solid #eee" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
            <th style={{ padding: "12px 16px", fontSize: "13px", color: "#888" }}>Book</th>
            <th style={{ padding: "12px 16px", fontSize: "13px", color: "#888" }}>Author</th>
            <th style={{ padding: "12px 16px", fontSize: "13px", color: "#888" }}>Amount</th>
            <th style={{ padding: "12px 16px", fontSize: "13px", color: "#888" }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((s) => (
            <tr key={s.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 500 }}>{s.book.title}</td>
              <td style={{ padding: "12px 16px", fontSize: "13px", color: "#666" }}>{s.book.author.name}</td>
              <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 500 }}>₦{s.amountNgn.toLocaleString()}</td>
              <td style={{ padding: "12px 16px", fontSize: "12px", color: "#999" }}>{new Date(s.saleDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {sales.length === 0 && <p style={{ color: "#999", fontSize: "14px", padding: "20px" }}>No sales recorded yet.</p>}
    </div>
  );
}
