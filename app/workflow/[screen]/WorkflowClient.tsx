
"use client";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

import RequestRegistration from "@/components/RequestRegistration";
import TransferManagement from "@/components/TransferManagement";
import DocumentCompletion from "@/components/DocumentCompletion";
import MatchingManagement from "@/components/MatchingManagement";
import TaskManagement from "@/components/TaskManagement";
import ExecutionManagement from "@/components/ExecutionManagement";
import ReviewManagement from "@/components/ReviewManagement";
import DeliveryManagement from "@/components/DeliveryManagement";
import ClosureManagement from "@/components/ClosureManagement";

type Field = {
  name: string;
  label: string;
  type?: "text" | "date" | "textarea" | "select";
  options?: string[];
};

const stages = [
  {
    id: "requests",
    number: 1,
    title: "تسجيل الطلب",
    description: "تسجيل بيانات العميل والخدمة المطلوبة.",
    fields: [
      { name: "clientName", label: "اسم العميل" },
      { name: "companyName", label: "اسم الشركة" },
      { name: "phone", label: "رقم الهاتف" },
      { name: "service", label: "الخدمة المطلوبة" },
      { name: "description", label: "وصف الطلب", type: "textarea" },
      { name: "receivedDate", label: "تاريخ استلام الطلب", type: "date" },
      {
        name: "priority",
        label: "الأولوية",
        type: "select",
        options: ["عادي", "متوسط", "عاجل"],
      },
    ] as Field[],
  },
  {
    id: "transfer",
    number: 2,
    title: "تحويل الطلب",
    description: "تحويل الطلب إلى القسم المختص داخل الشركة.",
    fields: [] as Field[],
  },
  {
    id: "documents",
    number: 3,
    title: "استكمال المستندات",
    description: "تسجيل المستندات المطلوبة ومتابعة استكمالها.",
    fields: [] as Field[],
  },
  {
    id: "matching",
    number: 4,
    title: "مطابقة المستندات",
    description: "مراجعة المستندات والتأكد من مطابقتها للمتطلبات.",
    fields: [] as Field[],
  },
  {
    id: "tasks",
    number: 5,
    title: "توزيع المهام",
    description: "اختيار المهمة وتحديد الموظف المسؤول عن تنفيذها.",
    fields: [] as Field[],
  },
  {
    id: "execution",
    number: 6,
    title: "تنفيذ المهمة",
    description: "متابعة تنفيذ الموظف للمهمة وتسجيل التحديثات.",
    fields: [] as Field[],
  },
  {
    id: "review",
    number: 7,
    title: "المراجعة",
    description: "مراجعة نتيجة التنفيذ واعتمادها أو إعادتها للتعديل.",
    fields: [] as Field[],
  },
  {
    id: "delivery",
    number: 8,
    title: "التسليم",
    description: "تسجيل المخرجات النهائية وطريقة التسليم.",
    fields: [] as Field[],
  },
  {
    id: "closure",
    number: 9,
    title: "إغلاق الطلب",
    description: "تأكيد استلام العميل وإغلاق الطلب.",
    fields: [] as Field[],
  },
];

const menu = [
  { id: "requests", title: "تسجيل الطلب" },
  { id: "transfer", title: "تحويل الطلب" },
  { id: "documents", title: "استكمال المستندات" },
  { id: "matching", title: "مطابقة المستندات" },
  { id: "tasks", title: "توزيع المهام" },
  { id: "execution", title: "تنفيذ المهمة" },
  { id: "review", title: "المراجعة" },
  { id: "delivery", title: "التسليم" },
  { id: "closure", title: "إغلاق الطلب" },
  { id: "settings", title: "الإعدادات" },
];

type WorkflowClientProps = {
  params: Promise<{ screen: string }>;
};

export default function WorkflowClient({ params }: WorkflowClientProps) {
  const { screen: routeScreen } = use(params);
  const router = useRouter();

  const screen = String(routeScreen || "");
  const stage = stages.find((item) => item.id === screen);

  const [data, setData] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("workflowRequest");

    if (stored) {
      try {
        setData(JSON.parse(stored));
      } catch {
        setData({});
      }
    }
  }, []);

  function handleChange(name: string, value: string) {
    setData((current) => ({
      ...current,
      [name]: value,
    }));

    setSaved(false);
  }

  function saveData() {
    localStorage.setItem("workflowRequest", JSON.stringify(data));
    setSaved(true);
  }

  function goToStage(id: string) {
    if (id === "settings") {
      router.push("/settings");
      return;
    }

    router.push(`/workflow/${id}`);
  }

  if (screen === "requests") {
    return <RequestRegistration />;
  }

  if (!stage) {
    return (
      <main className="workflow-layout" dir="rtl">
        <aside className="sidebar">
          <h2>خاطر اللواج</h2>
          <p>نظام إدارة الطلبات</p>

          <nav>
            {menu.map((item) => (
              <button
                key={item.id}
                onClick={() => goToStage(item.id)}
                className="nav-item"
              >
                {item.title}
              </button>
            ))}

            <button
              onClick={() => router.push("/")}
              className="nav-item"
            >
              لوحة التحكم
            </button>
          </nav>
        </aside>

        <section className="main-content">
          <h1>الصفحة غير موجودة</h1>

          <button
            className="primary-button"
            onClick={() => router.push("/")}
          >
            العودة للوحة التحكم
          </button>
        </section>
      </main>
    );
  }

  const currentIndex = stages.findIndex(
    (item) => item.id === stage.id
  );

  const previousStage = stages[currentIndex - 1];
  const nextStage = stages[currentIndex + 1];

  return (
    <main className="workflow-layout" dir="rtl">
      <aside className="sidebar">
        <h2>خاطر اللواج</h2>
        <p>نظام إدارة الطلبات</p>

        <nav>
          {menu.map((item) => (
            <button
              key={item.id}
              onClick={() => goToStage(item.id)}
              className={`nav-item ${
                item.id === screen ? "active" : ""
              }`}
            >
              {item.title}
            </button>
          ))}

          <button
            onClick={() => router.push("/")}
            className="nav-item"
          >
            لوحة التحكم
          </button>
        </nav>
      </aside>

      <section className="main-content">
        <div className="page-heading">
          <div>
            <span className="eyebrow">
              المرحلة {stage.number} من 9
            </span>

            <h1>{stage.title}</h1>
            <p>{stage.description}</p>
          </div>

          <button
            className="secondary-button"
            onClick={() => router.push("/")}
          >
            العودة للوحة التحكم
          </button>
        </div>

        <div className="progress-track">
          <div
            className="progress-value"
            style={{
              width: `${(stage.number / 9) * 100}%`,
            }}
          />
        </div>

        {stage.id === "transfer" ? (
          <TransferManagement />
        ) : stage.id === "documents" ? (
          <DocumentCompletion />
        ) : stage.id === "matching" ? (
          <MatchingManagement />
        ) : stage.id === "tasks" ? (
          <TaskManagement />
        ) : stage.id === "execution" ? (
          <ExecutionManagement />
        ) : stage.id === "review" ? (
          <ReviewManagement />
        ) : stage.id === "delivery" ? (
          <DeliveryManagement />
        ) : stage.id === "closure" ? (
          <ClosureManagement />
        ) : (
          <div className="form-card">
            <h2>بيانات المرحلة</h2>

            <div className="form-grid">
              {stage.fields.map((field) => (
                <div
                  className={`form-field ${
                    field.type === "textarea" ? "full-width" : ""
                  }`}
                  key={field.name}
                >
                  <label htmlFor={field.name}>
                    {field.label}
                  </label>

                  {field.type === "textarea" ? (
                    <textarea
                      id={field.name}
                      value={data[field.name] || ""}
                      onChange={(event) =>
                        handleChange(field.name, event.target.value)
                      }
                      placeholder={`اكتب ${field.label}`}
                      rows={4}
                    />
                  ) : field.type === "select" ? (
                    <select
                      id={field.name}
                      value={data[field.name] || ""}
                      onChange={(event) =>
                        handleChange(field.name, event.target.value)
                      }
                    >
                      <option value="">
                        اختر {field.label}
                      </option>

                      {field.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={field.name}
                      type={field.type || "text"}
                      value={data[field.name] || ""}
                      onChange={(event) =>
                        handleChange(field.name, event.target.value)
                      }
                      placeholder={`اكتب ${field.label}`}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="form-actions">
              <button
                className="primary-button"
                onClick={saveData}
              >
                حفظ البيانات
              </button>

              {saved && (
                <span className="saved-message">
                  تم حفظ البيانات
                </span>
              )}
            </div>
          </div>
        )}

        <div className="navigation-actions">
          {previousStage ? (
            <button
              className="secondary-button"
              onClick={() => goToStage(previousStage.id)}
            >
              المرحلة السابقة
            </button>
          ) : (
            <span />
          )}

          {nextStage && (
            <button
              className="primary-button"
              onClick={() => {
                if (
                  ![
                    "transfer",
                    "documents",
                    "matching",
                    "tasks",
                    "execution",
                    "review",
                    "delivery",
                    "closure",
                  ].includes(stage.id)
                ) {
                  saveData();
                }

                goToStage(nextStage.id);
              }}
            >
              الانتقال إلى {nextStage.title}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
