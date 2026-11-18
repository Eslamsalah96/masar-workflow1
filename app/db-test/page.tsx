
import { prisma } from "@/lib/prisma";


export default async function DatabaseTestPage() {
  let connected = false;
  let departments: { id: string; name: string }[] = [];
  let counts = {
    users: 0,
    customers: 0,
    requests: 0,
    tasks: 0,
  };
  let errorMessage = "";

  try {
    const [departmentData, users, customers, requests, tasks] =
      await Promise.all([
        prisma.department.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        prisma.user.count(),
        prisma.customer.count(),
        prisma.request.count(),
        prisma.workflowTask.count(),
      ]);

    departments = departmentData;
    counts = { users, customers, requests, tasks };
    connected = true;
  } catch (error) {
    console.error("Database test error:", error);
    errorMessage = "تعذر الاتصال بقاعدة البيانات.";
  }

  return (
    <main
      dir="rtl"
      style={{
        maxWidth: 900,
        margin: "50px auto",
        padding: 24,
        fontFamily: "Arial",
      }}
    >
      <h1>حالة قاعدة البيانات</h1>
      <p>اختبار اتصال نظام خاطر اللواج بقاعدة البيانات</p>

      <div
        style={{
          padding: 20,
          borderRadius: 12,
          background: connected ? "#dcfce7" : "#fee2e2",
          color: connected ? "#166534" : "#991b1b",
          marginBottom: 25,
        }}
      >
        <h2>
          {connected
            ? "✓ قاعدة البيانات متصلة وتعمل بنجاح"
            : "✕ يوجد مشكلة في الاتصال"}
        </h2>
        {!connected && <p>{errorMessage}</p>}
      </div>

      {connected && (
        <>
          <h2>البيانات المسجلة فعليًا</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 15,
            }}
          >
            {[
              ["المستخدمون", counts.users],
              ["العملاء", counts.customers],
              ["الطلبات", counts.requests],
              ["المهام", counts.tasks],
              ["الأقسام", departments.length],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  padding: 20,
                  border: "1px solid #ddd",
                  borderRadius: 12,
                  textAlign: "center",
                }}
              >
                <p>{label}</p>
                <h2 style={{ fontSize: 30 }}>{value}</h2>
              </div>
            ))}
          </div>

          <h2 style={{ marginTop: 30 }}>الأقسام المسجلة في النظام</h2>

          <ul>
            {departments.map((department) => (
              <li key={department.id} style={{ marginBottom: 10 }}>
                {department.name}
              </li>
            ))}
          </ul>

          <p style={{ color: "#15803d", marginTop: 25 }}>
            تم تنفيذ استعلامات مباشرة على قاعدة البيانات بنجاح.
          </p>
        </>
      )}
    </main>
  );
}
