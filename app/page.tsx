import Link from "next/link";
import AppShell from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
export const instant = false;
const stages = [
  {
    id: "requests",
    number: 1,
    title: "تسجيل الطلب",
    description: "إضافة بيانات العميل والطلب الجديد",
  },
  {
    id: "transfer",
    number: 2,
    title: "تحويل الطلب",
    description: "توجيه الطلب إلى القسم المختص بالشركة",
  },
  {
    id: "documents",
    number: 3,
    title: "استكمال المستندات",
    description: "تسجيل ومتابعة المستندات المطلوبة",
  },
  {
    id: "matching",
    number: 4,
    title: "مطابقة المستندات",
    description: "مراجعة المستندات والتأكد من مطابقتها",
  },
  {
    id: "tasks",
    number: 5,
    title: "توزيع المهام",
    description: "اختيار المهمة وتحديد الموظف المسؤول",
  },
  {
    id: "execution",
    number: 6,
    title: "تنفيذ المهمة",
    description: "متابعة تنفيذ المهمة وتسجيل النتائج",
  },
  {
    id: "review",
    number: 7,
    title: "المراجعة",
    description: "اعتماد التنفيذ أو إعادته للتعديل",
  },
  {
    id: "delivery",
    number: 8,
    title: "التسليم",
    description: "تسليم المخرجات النهائية للعميل",
  },
  {
    id: "closure",
    number: 9,
    title: "إغلاق الطلب",
    description: "تأكيد الاستلام وإغلاق الطلب",
  },
];

export default async function Dashboard() {
  const user = await requireUser();

  return (
    <AppShell user={user}>
      <div className="page-heading">
        <div>
          <span className="eyebrow">مرحبًا بك في النظام</span>
          <h1>لوحة التحكم</h1>
          <p>إدارة ومتابعة جميع مراحل الطلبات داخل الشركة.</p>
        </div>

        <Link href="/requests" className="primary-button">
          + تسجيل طلب جديد
        </Link>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <span>إجمالي مراحل العمل</span>
          <strong>9</strong>
        </div>

        <div className="stat-card">
          <span>المستخدم الحالي</span>
          <strong className="dashboard-user-name">{user.name}</strong>
        </div>

        <div className="stat-card">
          <span>حالة النظام</span>
          <strong className="dashboard-active">نشط</strong>
        </div>
      </div>

      <div className="section-heading">
        <div>
          <h2>مراحل سير العمل</h2>
          <p>اختر المرحلة التي تريد فتحها.</p>
        </div>
      </div>

      <div className="stage-grid">
        {stages.map((stage) => (
          <Link
            key={stage.id}
            href={`/workflow/${stage.id}`}
            className="stage-card"
          >
            <span className="stage-number">{stage.number}</span>
            <h3>{stage.title}</h3>
            <p>{stage.description}</p>
            <span className="stage-link">فتح المرحلة ←</span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}