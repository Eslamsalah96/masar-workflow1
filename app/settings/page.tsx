
"use client";

import { useState } from "react";

const input = { width: "100%", padding: 10, border: "1px solid #dbe2ea", borderRadius: 8, boxSizing: "border-box" as const };
const workflowStages = [
  "تسجيل الطلب",
  "مراجعة المدير",
  "تحويل الطلب",
  "مطابقة المستندات",
  "توزيع المهام",
  "تنفيذ المهمة",
  "مراجعة التنفيذ",
  "التسليم",
  "إغلاق الطلب",
];

export default function Page() {
  const [tab, setTab] = useState("company");
  const [saved, setSaved] = useState(false);
  const [company, setCompany] = useState({ name: "شركة مسار للخدمات", phone: "02XXXXXXXX", email: "info@masar.com", address: "القاهرة، مصر", taxNumber: "" });
  const [general, setGeneral] = useState({ language: "العربية", dateFormat: "DD/MM/YYYY", currency: "جنيه مصري (EGP)", maxUpload: "10", fileTypes: "PDF, JPG, PNG" });
  const [options, setOptions] = useState({ managerApproval: true, notifications: true, allowOptionalStages: true, requireDeadline: true });
  const [stages, setStages] = useState(workflowStages);
  const [newStage, setNewStage] = useState("");

  function saveDemo() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  function addStage() {
    const value = newStage.trim();
    if (value && !stages.includes(value)) {
      setStages(prev => [...prev, value]);
      setNewStage("");
    }
  }

  return (
    <main dir="rtl" className="main-content" style={{ color: "#243447" }}>
      <div className="page-heading">
        <h1>الإعدادات</h1>
        <p>إعدادات الشركة والنظام وسير عمل الطلبات.</p>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "20px 0" }}>
        {[["company", "بيانات الشركة"], ["general", "إعدادات عامة"], ["workflow", "سير العمل"], ["permissions", "إعدادات التشغيل"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ border: "1px solid #dbe2ea", borderRadius: 8, padding: "10px 16px", cursor: "pointer", background: tab === key ? "#1e5b85" : "white", color: tab === key ? "white" : "#425466", fontWeight: 600 }}>{label}</button>
        ))}
      </div>

      <section style={{ background: "white", border: "1px solid #e5eaf0", borderRadius: 12, padding: 22, maxWidth: 900 }}>
        {tab === "company" && <>
          <h2 style={{ fontSize: 19, marginTop: 0 }}>بيانات الشركة</h2>
          <p style={{ color: "#718096", fontSize: 13 }}>البيانات التعريفية التي يمكن استخدامها في التقارير والمستندات.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
            <label>اسم الشركة<input style={input} value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} /></label>
            <label>رقم الهاتف<input style={input} value={company.phone} onChange={e => setCompany({ ...company, phone: e.target.value })} /></label>
            <label>البريد الإلكتروني<input type="email" style={input} value={company.email} onChange={e => setCompany({ ...company, email: e.target.value })} /></label>
            <label>الرقم الضريبي<input style={input} value={company.taxNumber} onChange={e => setCompany({ ...company, taxNumber: e.target.value })} /></label>
            <label style={{ gridColumn: "1 / -1" }}>العنوان<input style={input} value={company.address} onChange={e => setCompany({ ...company, address: e.target.value })} /></label>
          </div>
        </>}

        {tab === "general" && <>
          <h2 style={{ fontSize: 19, marginTop: 0 }}>الإعدادات العامة</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
            <label>لغة النظام<select style={input} value={general.language} onChange={e => setGeneral({ ...general, language: e.target.value })}><option>العربية</option><option>English</option></select></label>
            <label>تنسيق التاريخ<select style={input} value={general.dateFormat} onChange={e => setGeneral({ ...general, dateFormat: e.target.value })}><option>DD/MM/YYYY</option><option>YYYY/MM/DD</option></select></label>
            <label>العملة<select style={input} value={general.currency} onChange={e => setGeneral({ ...general, currency: e.target.value })}><option>جنيه مصري (EGP)</option><option>دولار أمريكي (USD)</option><option>ريال سعودي (SAR)</option></select></label>
            <label>الحد الأقصى لحجم الملف (MB)<input type="number" min="1" max="50" style={input} value={general.maxUpload} onChange={e => setGeneral({ ...general, maxUpload: e.target.value })} /></label>
            <label style={{ gridColumn: "1 / -1" }}>أنواع الملفات المسموح بها<input style={input} value={general.fileTypes} onChange={e => setGeneral({ ...general, fileTypes: e.target.value })} /></label>
          </div>
        </>}

        {tab === "workflow" && <>
          <h2 style={{ fontSize: 19, marginTop: 0 }}>مراحل سير العمل</h2>
          <p style={{ color: "#718096", fontSize: 13 }}>ترتيب تجريبي لمراحل الطلب. يمكنك إضافة مرحلة جديدة أو حذف مرحلة من القائمة.</p>
          <div style={{ display: "grid", gap: 8 }}>
            {stages.map((stage, index) => <div key={`${stage}-${index}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: "1px solid #e5eaf0", borderRadius: 9, background: "#fafbfd" }}>
              <strong style={{ background: "#eaf1f7", color: "#1e5b85", width: 28, height: 28, display: "grid", placeItems: "center", borderRadius: 7 }}>{index + 1}</strong>
              <span style={{ flex: 1 }}>{stage}</span>
              <button onClick={() => setStages(prev => prev.filter((_, i) => i !== index))} style={{ border: 0, borderRadius: 7, padding: "6px 10px", color: "#b42318", background: "#fff0ee", cursor: "pointer" }}>حذف</button>
            </div>)}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <input placeholder="اسم المرحلة الجديدة" style={{ ...input, flex: "1 1 220px" }} value={newStage} onChange={e => setNewStage(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addStage(); } }} />
            <button onClick={addStage} style={{ background: "#1e5b85", color: "white", border: 0, borderRadius: 8, padding: "10px 16px", cursor: "pointer" }}>إضافة مرحلة</button>
          </div>
        </>}

        {tab === "permissions" && <>
          <h2 style={{ fontSize: 19, marginTop: 0 }}>إعدادات التشغيل</h2>
          <p style={{ color: "#718096", fontSize: 13 }}>خيارات توضيحية لسلوك النظام المقترح.</p>
          {([
            ["managerApproval", "اشتراط موافقة المدير قبل تحويل الطلب", "يجب مراجعة الطلب واعتماده قبل إرساله إلى القسم."],
            ["notifications", "تفعيل الإشعارات", "إظهار تنبيهات عند تحويل الطلب أو توزيع المهام."],
            ["allowOptionalStages", "السماح بالمراحل الاختيارية", "إمكانية تخطي المراحل غير المطلوبة لبعض أنواع الخدمات."],
            ["requireDeadline", "اشتراط تحديد موعد نهائي", "تحديد موعد مستهدف لتنفيذ المهمة."],
          ] as const).map(([key, title, description]) => <label key={key} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 0", borderBottom: "1px solid #edf0f4", cursor: "pointer" }}>
            <input type="checkbox" checked={options[key]} onChange={e => setOptions({ ...options, [key]: e.target.checked })} style={{ width: 18, height: 18, marginTop: 3 }} />
            <span><strong>{title}</strong><span style={{ display: "block", color: "#718096", fontSize: 13, marginTop: 4 }}>{description}</span></span>
          </label>)}
        </>}

        <div style={{ borderTop: "1px solid #edf0f4", marginTop: 22, paddingTop: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button onClick={saveDemo} style={{ background: "#1e5b85", color: "white", border: 0, borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontWeight: 600 }}>حفظ الإعدادات التجريبية</button>
          {saved && <span style={{ color: "#16845b", fontSize: 13 }}>تم تحديث القيم داخل الصفحة مؤقتًا.</span>}
        </div>
      </section>

      <p style={{ color: "#8793a2", fontSize: 12, marginTop: 14 }}>تنبيه: الإعدادات والمراحل المعروضة تجريبية. لا يتم تطبيقها على سير العمل الفعلي أو حفظها في قاعدة البيانات.</p>
    </main>
  );
}
