
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Department = { id: string; name: string };
type Employee = { id: string; name: string; departmentId: string | null };
type Customer = { id: string; name: string; phone?: string | null };

type WorkSession = {
  id: string;
  startedAt: string;
  stoppedAt: string | null;
  durationSeconds: number | null;
  user: { id: string; name: string };
};

type Expense = {
  id: string;
  amount: number;
  description: string;
  createdAt: string;
  employee: { name: string };
};

type DailyTask = {
  id: string;
  title: string;
  taskType: string;
  serviceName: string | null;
  customerName: string | null;
  companyName: string | null;
  description: string | null;
  status: string;
  deadlineAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  department: { id: string; name: string };
  assignedTo: { id: string; name: string } | null;
  createdBy: { name: string };
  customer: { id: string; name: string } | null;
  workSessions: WorkSession[];
  expenses: Expense[];
};

type ApiData = {
  tasks?: DailyTask[];
  departments?: Department[];
  employees?: Employee[];
  customers?: Customer[];
  error?: string;
};

const statusLabels: Record<string, string> = {
  PENDING: "لم تبدأ",
  IN_PROGRESS: "جاري التنفيذ",
  COMPLETED: "مكتملة",
  CANCELLED: "ملغاة",
};

const serviceSuggestions = [
  "استخراج شهادة",
  "تقديم إقرار",
  "مراجعة مستند",
  "تجهيز ملف",
  "تعديل بيانات",
  "استعلام حكومي",
  "متابعة طلب",
  "خدمة أخرى",
];

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ar-EG");
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function getTaskDuration(task: DailyTask, now: number) {
  return task.workSessions.reduce((total, session) => {
    if (session.durationSeconds !== null) {
      return total + session.durationSeconds;
    }

    if (!session.stoppedAt) {
      const startedAt = new Date(session.startedAt).getTime();
      return total + Math.max(0, Math.floor((now - startedAt) / 1000));
    }

    return total;
  }, 0);
}

export default function DailyTasksManagement() {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [now, setNow] = useState(Date.now());

  const [showForm, setShowForm] = useState(false);
  const [taskType, setTaskType] = useState("QUICK_SERVICE");
  const [departmentId, setDepartmentId] = useState("");
  const [title, setTitle] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [customServiceName, setCustomServiceName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [description, setDescription] = useState("");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");

  const [expenseTask, setExpenseTask] = useState<DailyTask | null>(null);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseSaving, setExpenseSaving] = useState(false);

  const [editTask, setEditTask] = useState<DailyTask | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [actionTaskId, setActionTaskId] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/daily-tasks", {
        cache: "no-store",
      });
      const data: ApiData = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر تحميل المهام اليومية");
      }

      setTasks(data.tasks || []);
      setDepartments(data.departments || []);
      setEmployees(data.employees || []);
      setCustomers(data.customers || []);

      if (!departmentId && data.departments?.length) {
        setDepartmentId(data.departments[0].id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء تحميل البيانات"
      );
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const statistics = useMemo(
    () => ({
      total: tasks.length,
      pending: tasks.filter((task) => task.status === "PENDING").length,
      progress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
      completed: tasks.filter((task) => task.status === "COMPLETED").length,
    }),
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    const term = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        !term ||
        [
          task.title,
          task.serviceName || "",
          task.customerName || "",
          task.companyName || "",
          task.customer?.name || "",
          task.assignedTo?.name || "",
          task.department.name,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      const matchesStatus =
        filterStatus === "ALL" || task.status === filterStatus;

      const matchesType =
        filterType === "ALL" || task.taskType === filterType;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [tasks, search, filterStatus, filterType]);

  const departmentEmployees = useMemo(
    () => employees.filter((employee) => employee.departmentId === departmentId),
    [employees, departmentId]
  );

  async function submitTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const finalServiceName =
      serviceName === "خدمة أخرى"
        ? customServiceName.trim()
        : serviceName.trim();

    if (!title.trim() || !departmentId) {
      setError("من فضلك أدخل اسم المهمة وحدد القسم.");
      return;
    }

    if (taskType === "QUICK_SERVICE" && !customerId && !customerName.trim()) {
      setError("الخدمة السريعة تحتاج إلى اختيار عميل أو كتابة اسم العميل.");
      return;
    }

    if (taskType === "QUICK_SERVICE" && !finalServiceName) {
      setError("من فضلك حدد اسم الخدمة.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/daily-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          taskType,
          departmentId,
          serviceName: taskType === "QUICK_SERVICE" ? finalServiceName : null,
          customerId: customerId || null,
          customerName: customerName.trim() || null,
          companyName: companyName.trim() || null,
          assignedToId: assignedToId || null,
          deadlineAt: deadlineAt || null,
          description: description.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر إنشاء المهمة");
      }

      setSuccess("تم إنشاء المهمة اليومية بنجاح.");
      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setTitle("");
    setTaskType("QUICK_SERVICE");
    setServiceName("");
    setCustomServiceName("");
    setCustomerId("");
    setCustomerName("");
    setCompanyName("");
    setAssignedToId("");
    setDeadlineAt("");
    setDescription("");
    setShowForm(false);
  }

  async function runAction(
    taskId: string,
    action: string,
    extra: Record<string, unknown> = {}
  ): Promise<boolean> {
    setError("");
    setSuccess("");
    setActionTaskId(taskId);

    try {
      const response = await fetch("/api/daily-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, action, ...extra }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر تنفيذ الإجراء");
      }

      setSuccess(result.message || "تم تنفيذ الإجراء بنجاح.");
      await loadData();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
      return false;
    } finally {
      setActionTaskId("");
    }
  }

  async function submitExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!expenseTask || expenseSaving) return;

    const amount = Number(expenseAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("أدخل قيمة مصروف صحيحة أكبر من صفر.");
      return;
    }

    if (!expenseDescription.trim()) {
      setError("اكتب وصف المصروف.");
      return;
    }

    setExpenseSaving(true);

    const saved = await runAction(expenseTask.id, "ADD_EXPENSE", {
      amount,
      description: expenseDescription.trim(),
    });

    if (saved) {
      setExpenseTask(null);
      setExpenseAmount("");
      setExpenseDescription("");
    }

    setExpenseSaving(false);
  }

  async function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editTask || editSaving) return;

    setEditSaving(true);

    const saved = await runAction(editTask.id, "UPDATE", {
      description: editDescription.trim(),
    });

    if (saved) {
      setEditTask(null);
      setEditDescription("");
    }

    setEditSaving(false);
  }

  if (loading) {
    return (
      <div className="dt-loading" dir="rtl">
        <span className="dt-spinner" />
        <p>جاري تحميل المهام اليومية...</p>
        <style jsx>{`
          .dt-loading {
            min-height: 300px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            color: #64748b;
          }
          .dt-spinner {
            width: 38px;
            height: 38px;
            border: 4px solid #e2e8f0;
            border-top-color: #1e5b85;
            border-radius: 50%;
            animation: dtspin 0.8s linear infinite;
          }
          @keyframes dtspin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dt-page" dir="rtl">
      <style jsx>{`
        .dt-page {
          color: #172b45;
          width: 100%;
          padding-bottom: 35px;
        }
        .dt-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 23px;
        }
        .dt-heading h1 {
          margin: 0 0 7px;
          color: #123b5d;
          font-size: 25px;
          font-weight: 800;
        }
        .dt-heading p {
          margin: 0;
          color: #718096;
          font-size: 13px;
        }
        .dt-primary, .dt-secondary, .dt-action {
          border: 0;
          border-radius: 9px;
          padding: 10px 15px;
          font: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }
        .dt-primary {
          background: #123b5d;
          color: white;
        }
        .dt-primary:hover { background: #1e5b85; }
        .dt-primary:disabled, .dt-action:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .dt-secondary {
          background: #edf3f8;
          color: #1e5b85;
        }
        .dt-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 13px;
          margin-bottom: 22px;
        }
        .dt-stat {
          background: white;
          border: 1px solid #e8edf3;
          border-radius: 13px;
          padding: 17px;
          box-shadow: 0 3px 12px rgba(15,40,70,.035);
        }
        .dt-stat span {
          display: block;
          color: #718096;
          font-size: 12px;
          margin-bottom: 8px;
        }
        .dt-stat strong {
          font-size: 25px;
          color: #123b5d;
        }
        .dt-card {
          background: white;
          border: 1px solid #e8edf3;
          border-radius: 14px;
          padding: 21px;
          margin-bottom: 20px;
          box-shadow: 0 3px 14px rgba(15,40,70,.035);
        }
        .dt-card h2 {
          margin: 0 0 17px;
          color: #123b5d;
          font-size: 17px;
          font-weight: 800;
        }
        .dt-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        .dt-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 0;
        }
        .dt-field.full { grid-column: 1 / -1; }
        .dt-field label {
          color: #344b63;
          font-size: 12px;
          font-weight: 700;
        }
        .dt-field input, .dt-field select, .dt-field textarea,
        .dt-filter input, .dt-filter select {
          width: 100%;
          border: 1px solid #dce4ec;
          border-radius: 8px;
          padding: 11px 12px;
          color: #243b53;
          background: #fff;
          font: inherit;
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
        }
        .dt-field input:focus, .dt-field select:focus,
        .dt-field textarea:focus, .dt-filter input:focus,
        .dt-filter select:focus {
          border-color: #4382ac;
          box-shadow: 0 0 0 3px rgba(30,91,133,.08);
        }
        .dt-field textarea { min-height: 85px; resize: vertical; }
        .dt-form-actions {
          display: flex;
          gap: 9px;
          margin-top: 18px;
          flex-wrap: wrap;
        }
        .dt-alert {
          padding: 12px 15px;
          border-radius: 9px;
          margin-bottom: 15px;
          font-size: 13px;
        }
        .dt-error { color: #a52d2d; background: #fff0f0; border: 1px solid #f3d0d0; }
        .dt-success { color: #176b43; background: #eaf8f0; border: 1px solid #cdebd9; }
        .dt-filters {
          display: grid;
          grid-template-columns: minmax(200px, 1fr) 180px 180px;
          gap: 10px;
          margin-bottom: 17px;
        }
        .dt-task-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .dt-task {
          border: 1px solid #e6edf3;
          border-radius: 12px;
          padding: 17px;
          background: #fff;
          min-width: 0;
        }
        .dt-task-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }
        .dt-task h3 {
          margin: 0 0 6px;
          color: #183d5b;
          font-size: 15px;
          font-weight: 800;
        }
        .dt-task-sub {
          color: #8291a2;
          font-size: 11px;
        }
        .dt-badge {
          display: inline-block;
          white-space: nowrap;
          border-radius: 20px;
          padding: 5px 9px;
          font-size: 10px;
          font-weight: 800;
        }
        .dt-pending { color: #a15b0b; background: #fff3df; }
        .dt-progress { color: #1d5e91; background: #e8f2fb; }
        .dt-completed { color: #177245; background: #e7f7ee; }
        .dt-cancelled { color: #9b3434; background: #ffeded; }
        .dt-meta {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
          padding: 12px 0;
          border-top: 1px solid #eef2f5;
          border-bottom: 1px solid #eef2f5;
        }
        .dt-meta div { min-width: 0; }
        .dt-meta span {
          display: block;
          color: #8a98a8;
          font-size: 10px;
          margin-bottom: 4px;
        }
        .dt-meta strong {
          display: block;
          color: #344b63;
          font-size: 12px;
          overflow-wrap: anywhere;
        }
        .dt-task-description {
          color: #68798b;
          font-size: 12px;
          line-height: 1.7;
          margin: 11px 0;
          white-space: pre-wrap;
        }
        .dt-task-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 12px;
        }
        .dt-action {
          padding: 8px 11px;
          font-size: 11px;
          background: #edf3f8;
          color: #1e5b85;
        }
        .dt-action.start { background: #e8f7ef; color: #177245; }
        .dt-action.stop { background: #fff3df; color: #a15b0b; }
        .dt-action.complete { background: #123b5d; color: white; }
        .dt-expenses {
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px dashed #e2e8ef;
          font-size: 11px;
          color: #64748b;
        }
        .dt-empty {
          padding: 35px 15px;
          text-align: center;
          color: #8190a2;
          border: 1px dashed #d7e0e8;
          border-radius: 11px;
          grid-column: 1 / -1;
          font-size: 13px;
        }
        .dt-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15,35,55,.45);
          display: grid;
          place-items: center;
          padding: 15px;
          z-index: 1000;
        }
        .dt-modal {
          width: min(440px, 100%);
          background: white;
          border-radius: 14px;
          padding: 22px;
          box-shadow: 0 15px 50px rgba(0,0,0,.18);
          max-height: 90vh;
          overflow-y: auto;
        }
        .dt-modal h2 {
          color: #123b5d;
          margin: 0 0 17px;
          font-size: 18px;
        }
        @media (max-width: 900px) {
          .dt-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .dt-task-list { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .dt-form-grid, .dt-filters { grid-template-columns: 1fr; }
          .dt-field.full { grid-column: auto; }
          .dt-card { padding: 15px; }
          .dt-heading h1 { font-size: 21px; }
        }
      `}</style>

      <div className="dt-heading">
        <div>
          <h1>المهام اليومية</h1>
          <p>إدارة الخدمات السريعة والمهام الداخلية ومتابعة وقت التنفيذ والمصروفات.</p>
        </div>
        <button
          className="dt-primary"
          type="button"
          onClick={() => setShowForm((value) => !value)}
        >
          {showForm ? "إغلاق النموذج" : "+ إضافة مهمة يومية"}
        </button>
      </div>

      {error && <div className="dt-alert dt-error">{error}</div>}
      {success && <div className="dt-alert dt-success">{success}</div>}

      <div className="dt-stats">
        <div className="dt-stat">
          <span>إجمالي المهام</span>
          <strong>{statistics.total}</strong>
        </div>
        <div className="dt-stat">
          <span>لم تبدأ</span>
          <strong>{statistics.pending}</strong>
        </div>
        <div className="dt-stat">
          <span>جاري التنفيذ</span>
          <strong>{statistics.progress}</strong>
        </div>
        <div className="dt-stat">
          <span>مكتملة</span>
          <strong>{statistics.completed}</strong>
        </div>
      </div>

      {showForm && (
        <section className="dt-card">
          <h2>تسجيل مهمة يومية جديدة</h2>

          <form onSubmit={submitTask}>
            <div className="dt-form-grid">
              <div className="dt-field">
                <label>نوع المهمة *</label>
                <select
                  value={taskType}
                  onChange={(event) => {
                    setTaskType(event.target.value);
                    setServiceName("");
                    setCustomServiceName("");
                  }}
                >
                  <option value="QUICK_SERVICE">خدمة سريعة لعميل</option>
                  <option value="INTERNAL">مهمة داخلية</option>
                </select>
              </div>

              <div className="dt-field">
                <label>القسم المسؤول *</label>
                <select
                  value={departmentId}
                  onChange={(event) => {
                    setDepartmentId(event.target.value);
                    setAssignedToId("");
                  }}
                  required
                >
                  <option value="">اختر القسم</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="dt-field">
                <label>اسم المهمة *</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="مثال: متابعة ملف العميل"
                  required
                />
              </div>

              {taskType === "QUICK_SERVICE" && (
                <>
                  <div className="dt-field">
                    <label>نوع الخدمة *</label>
                    <select
                      value={serviceName}
                      onChange={(event) => setServiceName(event.target.value)}
                      required
                    >
                      <option value="">اختر الخدمة</option>
                      {serviceSuggestions.map((service) => (
                        <option key={service} value={service}>
                          {service}
                        </option>
                      ))}
                    </select>
                  </div>

                  {serviceName === "خدمة أخرى" && (
                    <div className="dt-field">
                      <label>اكتب اسم الخدمة الأخرى *</label>
                      <input
                        value={customServiceName}
                        onChange={(event) =>
                          setCustomServiceName(event.target.value)
                        }
                        placeholder="اكتب اسم الخدمة"
                        required
                      />
                    </div>
                  )}

                  <div className="dt-field">
                    <label>اختيار عميل مسجل</label>
                    <select
                      value={customerId}
                      onChange={(event) => {
                        const selected = customers.find(
                          (customer) => customer.id === event.target.value
                        );
                        setCustomerId(event.target.value);
                        if (selected) setCustomerName(selected.name);
                      }}
                    >
                      <option value="">عميل جديد أو كتابة الاسم يدويًا</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="dt-field">
                    <label>اسم العميل</label>
                    <input
                      value={customerName}
                      onChange={(event) => {
                        setCustomerName(event.target.value);
                        if (event.target.value) setCustomerId("");
                      }}
                      placeholder="اسم العميل"
                    />
                  </div>

                  <div className="dt-field">
                    <label>اسم الشركة</label>
                    <input
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                      placeholder="اسم الشركة إن وجد"
                    />
                  </div>
                </>
              )}

              <div className="dt-field">
                <label>الموظف المسؤول</label>
                <select
                  value={assignedToId}
                  onChange={(event) => setAssignedToId(event.target.value)}
                >
                  <option value="">بدون تحديد موظف</option>
                  {departmentEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="dt-field">
                <label>موعد التسليم</label>
                <input
                  type="date"
                  value={deadlineAt}
                  onChange={(event) => setDeadlineAt(event.target.value)}
                />
              </div>

              <div className="dt-field full">
                <label>التفاصيل والتعليمات</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="اكتب أي تفاصيل أو تعليمات خاصة بالمهمة..."
                />
              </div>
            </div>

            <div className="dt-form-actions">
              <button className="dt-primary" type="submit" disabled={saving}>
                {saving ? "جاري الحفظ..." : "حفظ المهمة"}
              </button>
              <button
                className="dt-secondary"
                type="button"
                onClick={resetForm}
                disabled={saving}
              >
                إلغاء
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="dt-card">
        <h2>قائمة المهام اليومية</h2>

        <div className="dt-filters">
          <div className="dt-filter">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث باسم المهمة أو العميل أو الموظف..."
            />
          </div>
          <div className="dt-filter">
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
            >
              <option value="ALL">كل الحالات</option>
              <option value="PENDING">لم تبدأ</option>
              <option value="IN_PROGRESS">جاري التنفيذ</option>
              <option value="COMPLETED">مكتملة</option>
              <option value="CANCELLED">ملغاة</option>
            </select>
          </div>
          <div className="dt-filter">
            <select
              value={filterType}
              onChange={(event) => setFilterType(event.target.value)}
            >
              <option value="ALL">كل الأنواع</option>
              <option value="QUICK_SERVICE">خدمات سريعة</option>
              <option value="INTERNAL">مهام داخلية</option>
            </select>
          </div>
        </div>

        <div className="dt-task-list">
          {filteredTasks.length === 0 ? (
            <div className="dt-empty">
              لا توجد مهام مطابقة للبحث أو الفلاتر الحالية.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isRunning = task.workSessions.some(
                (session) => !session.stoppedAt
              );
              const totalExpenses = task.expenses.reduce(
                (sum, expense) => sum + expense.amount,
                0
              );

              return (
                <article className="dt-task" key={task.id}>
                  <div className="dt-task-top">
                    <div>
                      <h3>{task.title}</h3>
                      <div className="dt-task-sub">
                        {task.taskType === "INTERNAL"
                          ? "مهمة داخلية"
                          : "خدمة سريعة"}
                        {" · "}
                        {task.department.name}
                      </div>
                    </div>
                    <span
                      className={`dt-badge dt-${task.status.toLowerCase()}`}
                    >
                      {statusLabels[task.status] || task.status}
                    </span>
                  </div>

                  <div className="dt-meta">
                    <div>
                      <span>العميل / الشركة</span>
                      <strong>
                        {task.companyName ||
                          task.customerName ||
                          task.customer?.name ||
                          "غير مرتبط بعميل"}
                      </strong>
                    </div>
                    <div>
                      <span>الخدمة</span>
                      <strong>{task.serviceName || "مهمة داخلية"}</strong>
                    </div>
                    <div>
                      <span>الموظف المسؤول</span>
                      <strong>{task.assignedTo?.name || "غير محدد"}</strong>
                    </div>
                    <div>
                      <span>موعد التسليم</span>
                      <strong>{formatDate(task.deadlineAt)}</strong>
                    </div>
                    <div>
                      <span>تاريخ الإنشاء</span>
                      <strong>{formatDate(task.createdAt)}</strong>
                    </div>
                    <div>
                      <span>إجمالي وقت العمل المسجل</span>
                      <strong>{formatDuration(getTaskDuration(task, now))}</strong>
                    </div>
                  </div>

                  {task.description && (
                    <p className="dt-task-description">{task.description}</p>
                  )}

                  <div className="dt-task-actions">
                    <button
                      type="button"
                      className="dt-action"
                      onClick={() => {
                        setEditTask(task);
                        setEditDescription(task.description || "");
                        setError("");
                        setSuccess("");
                      }}
                    >
                      تعديل التعليمات
                    </button>

                    {task.status !== "COMPLETED" &&
                      task.status !== "CANCELLED" && (
                        <>
                          {!isRunning && (
                            <button
                              type="button"
                              className="dt-action start"
                              disabled={actionTaskId === task.id}
                              onClick={() => runAction(task.id, "START")}
                            >
                              ▶ بدء العمل
                            </button>
                          )}

                          {isRunning && (
                            <button
                              type="button"
                              className="dt-action stop"
                              disabled={actionTaskId === task.id}
                              onClick={() => runAction(task.id, "STOP")}
                            >
                              ■ إيقاف المؤقت
                            </button>
                          )}

                          <button
                            type="button"
                            className="dt-action complete"
                            disabled={actionTaskId === task.id}
                            onClick={() => {
                              if (
                                window.confirm("هل تريد إنهاء هذه المهمة؟")
                              ) {
                                runAction(task.id, "COMPLETE");
                              }
                            }}
                          >
                            إنهاء المهمة
                          </button>
                        </>
                      )}

                    <button
                      type="button"
                      className="dt-action"
                      disabled={actionTaskId === task.id}
                      onClick={() => {
                        setExpenseTask(task);
                        setExpenseAmount("");
                        setExpenseDescription("");
                        setError("");
                      }}
                    >
                      + تسجيل مصروف
                    </button>
                  </div>

                  <div className="dt-expenses">
                    <strong>
                      المصروفات: {totalExpenses.toLocaleString("ar-EG")} جنيه
                    </strong>
                    {task.expenses.length > 0 && (
                      <span>
                        {" · "}
                        {task.expenses.length} عملية مصروف مسجلة
                      </span>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      {expenseTask && (
        <div
          className="dt-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !expenseSaving
            ) {
              setExpenseTask(null);
            }
          }}
        >
          <div className="dt-modal" dir="rtl">
            <h2>تسجيل مصروف للمهمة</h2>
            <p className="dt-task-sub">{expenseTask.title}</p>

            <form onSubmit={submitExpense}>
              <div className="dt-field" style={{ marginTop: 15 }}>
                <label>قيمة المصروف بالجنيه *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={expenseAmount}
                  onChange={(event) => setExpenseAmount(event.target.value)}
                  required
                  disabled={expenseSaving}
                />
              </div>

              <div className="dt-field" style={{ marginTop: 15 }}>
                <label>وصف المصروف *</label>
                <textarea
                  value={expenseDescription}
                  onChange={(event) =>
                    setExpenseDescription(event.target.value)
                  }
                  placeholder="سبب المصروف أو تفاصيله..."
                  required
                  disabled={expenseSaving}
                />
              </div>

              <div className="dt-form-actions">
                <button
                  className="dt-primary"
                  type="submit"
                  disabled={expenseSaving}
                >
                  {expenseSaving ? "جاري الحفظ..." : "حفظ المصروف"}
                </button>
                <button
                  className="dt-secondary"
                  type="button"
                  disabled={expenseSaving}
                  onClick={() => setExpenseTask(null)}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editTask && (
        <div
          className="dt-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !editSaving) {
              setEditTask(null);
            }
          }}
        >
          <div className="dt-modal" dir="rtl">
            <h2>تعديل تعليمات المهمة</h2>
            <p className="dt-task-sub">{editTask.title}</p>

            <form onSubmit={submitEdit}>
              <div className="dt-field" style={{ marginTop: 15 }}>
                <label>التفاصيل والتعليمات</label>
                <textarea
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  placeholder="اكتب تفاصيل المهمة أو الملاحظات..."
                  maxLength={3000}
                  disabled={editSaving}
                />
                <small style={{ color: "#8291a2", fontSize: 11 }}>
                  الحد الأقصى 3000 حرف
                </small>
              </div>

              <div className="dt-form-actions">
                <button
                  className="dt-primary"
                  type="submit"
                  disabled={editSaving}
                >
                  {editSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
                </button>
                <button
                  className="dt-secondary"
                  type="button"
                  disabled={editSaving}
                  onClick={() => setEditTask(null)}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
