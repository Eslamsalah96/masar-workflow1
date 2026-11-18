
"use client";

import { useState } from "react";

type Department = { id: number; name: string; manager: string; employees: number; description: string; active: boolean };

const initialDepartments: Department[] = [
  { id: 1, name: "خدمة العملاء", manager: "سارة محمود", employees: 4, description: "استقبال العملاء وتسجيل الطلبات ومتابعتها الأولية.", active: true },
  { id: 2, name: "الشؤون القانونية", manager: "أحمد حسن", employees: 6, description: "مراجعة العقود والمستندات والإجراءات القانونية.", active: true },
  { id: 3, name: "تأسيس الشركات", manager: "محمد علي", employees: 5, description: "تنفيذ إجراءات تأسيس الشركات وتعديلاتها.", active: true },
  { id: 4, name: "المراجعة", manager: "منى إبراهيم", employees: 3, description: "مراجعة الأعمال قبل التسليم النهائي.", active: true },
  { id: 5, name: "الحسابات", manager: "غير محدد", employees: 2, description: "متابعة المصروفات والحسابات.", active: false },
];

const input = { width: "100%", padding: 10, border: "1px solid #dbe2ea", borderRadius: 8, boxSizing: "border-box" as const };

export default function Page() {
  const [departments, setDepartments] = useState(initialDepartments);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", manager: "", description: "" });

  function addDepartment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDepartments(prev => [...prev, { ...form, id: Date.now(), employees: 0, active: true }]);
    setForm({ name: "", manager: "", description: "" });
    setShowForm(false);
  }

  const visible = departments.filter(d => `${d.name} ${d.manager}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <main dir="rtl" className="main-content" style={{ color: "#243447" }}>
      <div className="page-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div><h1>الأقسام</h1><p>إدارة أقسام الشركة وتوزيع المسؤوليات.</p></div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: "#1e5b85", color: "white", border: 0, borderRadius: 8, padding: "10px 16px", cursor: "pointer" }}>＋ إضافة قسم</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, margin: "20px 0" }}>
        {[["إجمالي الأقسام", departments.length], ["الأقسام النشطة", departments.filter(d => d.active).length], ["إجمالي الموظفين", departments.reduce((sum, d) => sum + d.employees, 0)]].map(([label, value]) => <div key={label} style={{ background: "white", border: "1px solid #e5eaf0", borderRadius: 12, padding: 18 }}><span style={{ color: "#718096", fontSize: 13 }}>{label}</span><strong style={{ display: "block", fontSize: 26, marginTop: 8 }}>{value}</strong></div>)}
      </div>

      {showForm && <form onSubmit={addDepartment} style={{ background: "white", padding: 20, borderRadius: 12, border: "1px solid #e5eaf0", marginBottom: 18 }}>
        <h3 style={{ marginTop: 0 }}>إضافة قسم جديد</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
          <input required placeholder="اسم القسم" style={input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input placeholder="اسم مدير القسم" style={input} value={form.manager} onChange={e => setForm({ ...form, manager: e.target.value })} />
          <input placeholder="وصف القسم ومسؤولياته" style={input} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button type="submit" style={{ background: "#1e5b85", color: "white", border: 0, borderRadius: 8, padding: "9px 16px", cursor: "pointer" }}>حفظ القسم</button>
          <button type="button" onClick={() => setShowForm(false)} style={{ background: "#edf1f5", border: 0, borderRadius: 8, padding: "9px 16px", cursor: "pointer" }}>إلغاء</button>
        </div>
      </form>}

      <div style={{ marginBottom: 16 }}><input placeholder="ابحث عن قسم أو مدير..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...input, maxWidth: 420 }} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 16 }}>
        {visible.map(d => <article key={d.id} style={{ background: "white", border: "1px solid #e5eaf0", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <h3 style={{ margin: 0, color: "#123b5d" }}>{d.name}</h3>
            <span style={{ fontSize: 12, padding: "5px 9px", borderRadius: 20, color: d.active ? "#16845b" : "#9a6700", background: d.active ? "#e8f7ef" : "#fff5dc" }}>{d.active ? "نشط" : "متوقف"}</span>
          </div>
          <p style={{ color: "#718096", fontSize: 13, minHeight: 38, lineHeight: 1.7 }}>{d.description || "لا يوجد وصف للقسم."}</p>
          <div style={{ borderTop: "1px solid #edf0f4", paddingTop: 12, lineHeight: 2, fontSize: 14 }}>
            <div><span style={{ color: "#718096" }}>مدير القسم: </span><strong>{d.manager || "غير محدد"}</strong></div>
            <div><span style={{ color: "#718096" }}>عدد الموظفين: </span><strong>{d.employees}</strong></div>
          </div>
          <button onClick={() => setDepartments(prev => prev.map(x => x.id === d.id ? { ...x, active: !x.active } : x))} style={{ marginTop: 12, width: "100%", border: "1px solid #dbe2ea", background: "#f7f9fb", color: "#1e5b85", borderRadius: 8, padding: 9, cursor: "pointer" }}>{d.active ? "إيقاف القسم مؤقتًا" : "تفعيل القسم"}</button>
        </article>)}
      </div>
      {visible.length === 0 && <p style={{ textAlign: "center", color: "#718096" }}>لا توجد أقسام مطابقة.</p>}
      <p style={{ color: "#8793a2", fontSize: 12, marginTop: 18 }}>بيانات الأقسام تجريبية مؤقتة وغير مرتبطة بقاعدة البيانات.</p>
    </main>
  );
}
