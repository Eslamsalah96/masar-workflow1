
"use client";

import { useMemo, useState } from "react";

type Customer = {
  id: number;
  name: string;
  type: string;
  phone: string;
  email: string;
  taxNumber: string;
  status: string;
};

const initialCustomers: Customer[] = [
  { id: 1, name: "شركة النور للتجارة", type: "شركة", phone: "01012345678", email: "info@elnour.com", taxNumber: "123-456-789", status: "نشط" },
  { id: 2, name: "أحمد محمد علي", type: "فرد", phone: "01123456789", email: "ahmed@example.com", taxNumber: "987-654-321", status: "نشط" },
  { id: 3, name: "شركة المستقبل للاستثمار", type: "شركة", phone: "01234567890", email: "contact@future.com", taxNumber: "456-789-123", status: "نشط" },
  { id: 4, name: "منى إبراهيم", type: "فرد", phone: "01512345678", email: "mona@example.com", taxNumber: "321-654-987", status: "غير نشط" },
];

const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #dbe2ea", borderRadius: 8, fontSize: 14, boxSizing: "border-box" as const };
const buttonStyle = { border: 0, borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 600 as const };

export default function Page() {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("الكل");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "شركة", phone: "", email: "", taxNumber: "" });

  const filtered = useMemo(() => customers.filter((c) => {
    const matchesSearch = [c.name, c.phone, c.email, c.taxNumber].some((v) => v.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch && (filter === "الكل" || c.type === filter);
  }), [customers, search, filter]);

  function addCustomer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCustomers((prev) => [{ ...form, id: Date.now(), status: "نشط" }, ...prev]);
    setForm({ name: "", type: "شركة", phone: "", email: "", taxNumber: "" });
    setShowForm(false);
  }

  return (
    <main dir="rtl" className="main-content" style={{ color: "#243447" }}>
      <div className="page-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div><h1>العملاء</h1><p>إدارة بيانات العملاء والشركات ومعلومات التواصل.</p></div>
        <button onClick={() => setShowForm(!showForm)} style={{ ...buttonStyle, background: "#1e5b85", color: "white" }}>＋ إضافة عميل</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, margin: "20px 0" }}>
        {[["إجمالي العملاء", customers.length], ["الشركات", customers.filter(c => c.type === "شركة").length], ["الأفراد", customers.filter(c => c.type === "فرد").length], ["العملاء النشطون", customers.filter(c => c.status === "نشط").length]].map(([label, value]) => (
          <div key={label} style={{ background: "white", padding: 18, borderRadius: 12, border: "1px solid #e5eaf0" }}>
            <div style={{ color: "#718096", fontSize: 13 }}>{label}</div><strong style={{ display: "block", fontSize: 25, marginTop: 8 }}>{value}</strong>
          </div>
        ))}
      </div>

      {showForm && <form onSubmit={addCustomer} style={{ background: "white", padding: 20, borderRadius: 12, border: "1px solid #e5eaf0", marginBottom: 18 }}>
        <h3 style={{ marginTop: 0 }}>إضافة عميل جديد</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
          <input required placeholder="اسم العميل / الشركة" style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option>شركة</option><option>فرد</option></select>
          <input required placeholder="رقم الهاتف" style={inputStyle} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="البريد الإلكتروني" type="email" style={inputStyle} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <input placeholder="الرقم الضريبي" style={inputStyle} value={form.taxNumber} onChange={e => setForm({ ...form, taxNumber: e.target.value })} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button type="submit" style={{ ...buttonStyle, background: "#1e5b85", color: "white" }}>حفظ العميل</button>
          <button type="button" onClick={() => setShowForm(false)} style={{ ...buttonStyle, background: "#edf1f5", color: "#334155" }}>إلغاء</button>
        </div>
      </form>}

      <section style={{ background: "white", border: "1px solid #e5eaf0", borderRadius: 12, padding: 18 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <input placeholder="ابحث بالاسم أو الهاتف أو الرقم الضريبي..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, flex: "1 1 260px" }} />
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ ...inputStyle, width: 160 }}><option>الكل</option><option>شركة</option><option>فرد</option></select>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right", minWidth: 700 }}>
            <thead><tr style={{ background: "#f5f7fa" }}>{["اسم العميل", "النوع", "رقم الهاتف", "البريد الإلكتروني", "الرقم الضريبي", "الحالة", "إجراء"].map(h => <th key={h} style={{ padding: 12, color: "#526174", fontSize: 13 }}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map(c => <tr key={c.id} style={{ borderTop: "1px solid #edf0f4" }}>
              <td style={{ padding: 12, fontWeight: 600 }}>{c.name}</td><td style={{ padding: 12 }}>{c.type}</td><td style={{ padding: 12 }}>{c.phone}</td><td style={{ padding: 12 }}>{c.email || "—"}</td><td style={{ padding: 12 }}>{c.taxNumber || "—"}</td>
              <td style={{ padding: 12 }}><span style={{ color: c.status === "نشط" ? "#16845b" : "#9a6700", background: c.status === "نشط" ? "#e8f7ef" : "#fff5dc", padding: "4px 9px", borderRadius: 20, fontSize: 12 }}>{c.status}</span></td>
              <td style={{ padding: 12 }}><button onClick={() => setCustomers(prev => prev.map(x => x.id === c.id ? { ...x, status: x.status === "نشط" ? "غير نشط" : "نشط" } : x))} style={{ ...buttonStyle, padding: "6px 10px", background: "#edf3f8", color: "#1e5b85" }}>تغيير الحالة</button></td>
            </tr>)}</tbody>
          </table>
          {filtered.length === 0 && <p style={{ textAlign: "center", color: "#718096", padding: 24 }}>لا توجد نتائج مطابقة للبحث.</p>}
        </div>
        <p style={{ color: "#8793a2", fontSize: 12, marginBottom: 0 }}>عرض {filtered.length} من أصل {customers.length} عميل — بيانات تجريبية مؤقتة.</p>
      </section>
    </main>
  );
}
