
"use client";

import { useMemo, useState } from "react";

type User = { id: number; name: string; email: string; role: string; department: string; active: boolean };

const initialUsers: User[] = [
  { id: 1, name: "مدير النظام", email: "admin@masar.com", role: "مدير عام", department: "الإدارة", active: true },
  { id: 2, name: "أحمد حسن", email: "ahmed@masar.com", role: "مدير قسم", department: "الشؤون القانونية", active: true },
  { id: 3, name: "سارة محمود", email: "sara@masar.com", role: "خدمة العملاء", department: "خدمة العملاء", active: true },
  { id: 4, name: "محمد علي", email: "mohamed@masar.com", role: "موظف", department: "تأسيس الشركات", active: true },
  { id: 5, name: "منى إبراهيم", email: "mona@masar.com", role: "موظف", department: "المراجعة", active: false },
];

const roles = ["مدير عام", "مدير قسم", "موظف", "سكرتارية", "خدمة العملاء"];
const departments = ["الإدارة", "خدمة العملاء", "الشؤون القانونية", "تأسيس الشركات", "المراجعة", "الحسابات"];
const field = { width: "100%", padding: 10, border: "1px solid #dbe2ea", borderRadius: 8, boxSizing: "border-box" as const };

export default function Page() {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("الكل");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "موظف", department: "تأسيس الشركات" });

  const filtered = useMemo(() => users.filter(u => {
    const matches = `${u.name} ${u.email} ${u.department}`.toLowerCase().includes(search.toLowerCase());
    return matches && (roleFilter === "الكل" || u.role === roleFilter);
  }), [users, search, roleFilter]);

  function addUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (users.some(u => u.email.toLowerCase() === form.email.toLowerCase())) {
      alert("هذا البريد الإلكتروني مسجل بالفعل في البيانات التجريبية.");
      return;
    }
    setUsers(prev => [{ ...form, id: Date.now(), active: true }, ...prev]);
    setForm({ name: "", email: "", role: "موظف", department: "تأسيس الشركات" });
    setShowForm(false);
  }

  return (
    <main dir="rtl" className="main-content" style={{ color: "#243447" }}>
      <div className="page-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div><h1>المستخدمون</h1><p>إدارة حسابات فريق العمل والأدوار والأقسام.</p></div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: "#1e5b85", color: "white", border: 0, borderRadius: 8, padding: "10px 16px", cursor: "pointer" }}>＋ إضافة مستخدم</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, margin: "20px 0" }}>
        {[["إجمالي المستخدمين", users.length], ["الحسابات النشطة", users.filter(u => u.active).length], ["الحسابات المتوقفة", users.filter(u => !u.active).length], ["مديرو الأقسام", users.filter(u => u.role === "مدير قسم").length]].map(([label, value]) => <div key={label} style={{ background: "white", border: "1px solid #e5eaf0", borderRadius: 12, padding: 18 }}><span style={{ color: "#718096", fontSize: 13 }}>{label}</span><strong style={{ display: "block", fontSize: 25, marginTop: 8 }}>{value}</strong></div>)}
      </div>

      {showForm && <form onSubmit={addUser} style={{ background: "white", border: "1px solid #e5eaf0", borderRadius: 12, padding: 20, marginBottom: 18 }}>
        <h3 style={{ marginTop: 0 }}>إضافة مستخدم تجريبي</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          <input required placeholder="اسم المستخدم" style={field} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input required type="email" placeholder="البريد الإلكتروني" style={field} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <select style={field} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>{roles.map(r => <option key={r}>{r}</option>)}</select>
          <select style={field} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>{departments.map(d => <option key={d}>{d}</option>)}</select>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button type="submit" style={{ background: "#1e5b85", color: "white", border: 0, borderRadius: 8, padding: "9px 16px", cursor: "pointer" }}>حفظ المستخدم</button>
          <button type="button" onClick={() => setShowForm(false)} style={{ background: "#edf1f5", border: 0, borderRadius: 8, padding: "9px 16px", cursor: "pointer" }}>إلغاء</button>
        </div>
      </form>}

      <section style={{ background: "white", border: "1px solid #e5eaf0", borderRadius: 12, padding: 18 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <input placeholder="ابحث بالاسم أو البريد أو القسم..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...field, flex: "1 1 250px" }} />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ ...field, width: 190 }}><option>الكل</option>{roles.map(r => <option key={r}>{r}</option>)}</select>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right", minWidth: 650 }}>
            <thead><tr style={{ background: "#f5f7fa" }}>{["المستخدم", "البريد الإلكتروني", "الدور", "القسم", "الحالة", "إجراء"].map(h => <th key={h} style={{ padding: 12, fontSize: 13, color: "#526174" }}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map(u => <tr key={u.id} style={{ borderTop: "1px solid #edf0f4" }}>
              <td style={{ padding: 12, fontWeight: 600 }}>{u.name}</td><td style={{ padding: 12 }}>{u.email}</td><td style={{ padding: 12 }}>{u.role}</td><td style={{ padding: 12 }}>{u.department}</td>
              <td style={{ padding: 12 }}><span style={{ padding: "4px 9px", borderRadius: 20, fontSize: 12, background: u.active ? "#e8f7ef" : "#fff5dc", color: u.active ? "#16845b" : "#9a6700" }}>{u.active ? "نشط" : "متوقف"}</span></td>
              <td style={{ padding: 12 }}><button onClick={() => setUsers(prev => prev.map(x => x.id === u.id ? { ...x, active: !x.active } : x))} style={{ border: 0, borderRadius: 7, padding: "7px 10px", background: "#edf3f8", color: "#1e5b85", cursor: "pointer" }}>{u.active ? "إيقاف الحساب" : "تفعيل الحساب"}</button></td>
            </tr>)}</tbody>
          </table>
          {filtered.length === 0 && <p style={{ textAlign: "center", color: "#718096", padding: 20 }}>لا توجد نتائج مطابقة.</p>}
        </div>
        <p style={{ color: "#8793a2", fontSize: 12, marginBottom: 0 }}>المستخدمون هنا بيانات تجريبية فقط. إضافة المستخدم لا تنشئ حساب دخول حقيقيًا.</p>
      </section>
    </main>
  );
}
