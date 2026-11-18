
"use client";

import { useEffect, useMemo, useState } from "react";

type Department = {
  id: string;
  name: string;
};

type Employee = {
  id: string;
  name: string;
  departmentId: string | null;
};

type TaskType = {
  id: string;
  name: string;
  departmentId: string;
};

type RequestItem = {
  id: string;
  requestNumber: string;
  serviceName: string;
  currentDepartmentId: string | null;
  customer?: { name: string } | null;
  currentDepartment?: { name: string } | null;
};

type TaskItem = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  expectedEndAt: string | null;
  request: {
    id: string;
    requestNumber: string;
    serviceName: string;
    customer: { name: string } | null;
  };
  department: { id: string; name: string };
  taskType: { id: string; name: string };
  assignedTo: { id: string; name: string } | null;
  assignedBy: { id: string; name: string };
};

const suggestedNames = [
  "مراجعة الطلب",
  "إعداد المستندات",
  "استخراج التراخيص",
  "مراجعة قانونية",
  "مراجعة مالية",
  "التواصل مع العميل",
  "تجهيز الملف النهائي",
  "مهمة أخرى",
];

const statusLabels: Record<string, string> = {
  PENDING: "لم تبدأ",
  IN_PROGRESS: "جاري التنفيذ",
  COMPLETED: "مكتملة",
  CANCELLED: "ملغاة",
};

const statusClasses: Record<string, string> = {
  PENDING: "pending",
  IN_PROGRESS: "progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export default function TaskManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  const [departmentId, setDepartmentId] = useState("");
  const [requestId, setRequestId] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [taskName, setTaskName] = useState("");
  const [customTaskName, setCustomTaskName] = useState("");
  const [expectedEndAt, setExpectedEndAt] = useState("");
  const [instructions, setInstructions] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);

        const [tasksResponse, requestsResponse] = await Promise.all([
          fetch("/api/tasks"),
          fetch("/api/requests"),
        ]);

        const tasksData = await tasksResponse.json();
        const requestsData = await requestsResponse.json();

        if (!tasksResponse.ok) {
          throw new Error(tasksData.error || "تعذر تحميل بيانات المهام");
        }

        if (!requestsResponse.ok) {
          throw new Error(requestsData.error || "تعذر تحميل الطلبات");
        }

        setDepartments(tasksData.departments || []);
        setEmployees(tasksData.employees || []);
        setTaskTypes(tasksData.taskTypes || []);
        setTasks(tasksData.tasks || []);
        setRequests(requestsData.requests || []);

        if (tasksData.departments?.length) {
          setDepartmentId(tasksData.departments[0].id);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "حدث خطأ أثناء تحميل البيانات"
        );
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  useEffect(() => {
    if (!departmentId) return;

    async function loadDepartmentData() {
      try {
        setError("");

        const response = await fetch(
          `/api/tasks?departmentId=${encodeURIComponent(departmentId)}`
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "تعذر تحميل مهام القسم");
        }

        setEmployees(result.employees || []);
        setTaskTypes(result.taskTypes || []);
        setTasks(result.tasks || []);
        setAssignedToId("");
        setRequestId("");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "حدث خطأ أثناء تحميل القسم"
        );
      }
    }

    loadDepartmentData();
  }, [departmentId]);

  const departmentRequests = useMemo(
    () =>
      requests.filter(
        (request) => request.currentDepartmentId === departmentId
      ),
    [requests, departmentId]
  );

  const availableTaskNames = useMemo(() => {
    const names = new Set([
      ...suggestedNames,
      ...taskTypes.map((item) => item.name),
    ]);

    return Array.from(names);
  }, [taskTypes]);

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
    const value = search.trim().toLowerCase();

    if (!value) return tasks;

    return tasks.filter((task) =>
      [
        task.title,
        task.request.requestNumber,
        task.request.customer?.name || "",
        task.assignedTo?.name || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [tasks, search]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const finalTaskName =
      taskName === "مهمة أخرى" ? customTaskName.trim() : taskName;

    if (!departmentId || !requestId || !assignedToId || !finalTaskName) {
      setError("من فضلك أكمل جميع البيانات المطلوبة");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          departmentId,
          requestId,
          assignedToId,
          taskName: finalTaskName,
          expectedEndAt: expectedEndAt || null,
          instructions,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر توزيع المهمة");
      }

      setSuccess("تم توزيع المهمة بنجاح");

      setTaskName("");
      setCustomTaskName("");
      setRequestId("");
      setAssignedToId("");
      setExpectedEndAt("");
      setInstructions("");

      const refreshResponse = await fetch(
        `/api/tasks?departmentId=${encodeURIComponent(departmentId)}`
      );

      const refreshData = await refreshResponse.json();

      if (refreshResponse.ok) {
        setTasks(refreshData.tasks || []);
        setTaskTypes(refreshData.taskTypes || []);
        setEmployees(refreshData.employees || []);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء توزيع المهمة"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="tm-loading" dir="rtl">
        <div className="tm-spinner" />
        <p>جاري تحميل بيانات المهام...</p>
        <style jsx>{`
          .tm-loading {
            min-height: 300px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #64748b;
            gap: 14px;
          }
          .tm-spinner {
            width: 38px;
            height: 38px;
            border: 4px solid #e2e8f0;
            border-top-color: #1e5b85;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="tm-page" dir="rtl">
      <style jsx>{`
        .tm-page {
          color: #172b45;
          width: 100%;
          padding-bottom: 30px;
        }

        .tm-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .tm-title-area {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .tm-main-icon {
          width: 54px;
          height: 54px;
          border-radius: 15px;
          display: grid;
          place-items: center;
          color: white;
          background: linear-gradient(135deg, #123b5d, #2878a8);
          font-size: 25px;
          box-shadow: 0 7px 18px rgba(18, 59, 93, 0.18);
        }

        .tm-heading h1 {
          margin: 0 0 6px;
          font-size: 25px;
          font-weight: 800;
          color: #123b5d;
        }

        .tm-heading p {
          margin: 0;
          color: #718096;
          font-size: 13px;
        }

        .tm-department-label {
          background: #eaf2f8;
          color: #1e5b85;
          padding: 10px 15px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
        }

        .tm-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 24px;
        }

        .tm-stat {
          background: white;
          border: 1px solid #e8edf3;
          border-radius: 14px;
          padding: 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 3px 12px rgba(15, 40, 70, 0.035);
        }

        .tm-stat-icon {
          width: 43px;
          height: 43px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          font-size: 21px;
          flex-shrink: 0;
        }

        .tm-stat-icon.blue { background: #eaf2fa; color: #1e5b85; }
        .tm-stat-icon.orange { background: #fff3e6; color: #d97706; }
        .tm-stat-icon.purple { background: #f1edff; color: #7656c9; }
        .tm-stat-icon.green { background: #e8f7ef; color: #16834b; }

        .tm-stat-label {
          font-size: 12px;
          color: #718096;
          margin-bottom: 5px;
        }

        .tm-stat-number {
          font-size: 24px;
          font-weight: 800;
          color: #1b3552;
          line-height: 1;
        }

        .tm-card {
          background: white;
          border: 1px solid #e8edf3;
          border-radius: 15px;
          padding: 23px;
          margin-bottom: 22px;
          box-shadow: 0 3px 14px rgba(15, 40, 70, 0.035);
        }

        .tm-card-heading {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 18px;
          margin-bottom: 20px;
          border-bottom: 1px solid #edf1f5;
        }

        .tm-card-icon {
          width: 39px;
          height: 39px;
          display: grid;
          place-items: center;
          background: #edf4fa;
          color: #1e5b85;
          border-radius: 11px;
          font-size: 19px;
        }

        .tm-card-heading h2 {
          margin: 0 0 4px;
          font-size: 17px;
          color: #123b5d;
          font-weight: 800;
        }

        .tm-card-heading p {
          margin: 0;
          font-size: 12px;
          color: #8190a2;
        }

        .tm-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 19px;
        }

        .tm-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }

        .tm-field.full {
          grid-column: 1 / -1;
        }

        .tm-field label {
          color: #344b63;
          font-size: 13px;
          font-weight: 700;
        }

        .tm-field label span {
          color: #dc5555;
          margin-right: 3px;
        }

        .tm-field input,
        .tm-field select,
        .tm-field textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #dce4ec;
          background: #fbfcfe;
          border-radius: 9px;
          padding: 12px 13px;
          color: #263d55;
          font-family: inherit;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .tm-field input:focus,
        .tm-field select:focus,
        .tm-field textarea:focus {
          border-color: #367ba6;
          box-shadow: 0 0 0 3px rgba(54, 123, 166, 0.1);
          background: white;
        }

        .tm-field input:disabled,
        .tm-field select:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .tm-field textarea {
          resize: vertical;
          min-height: 95px;
        }

        .tm-field small {
          font-size: 11px;
          color: #d97706;
        }

        .tm-form-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-top: 1px solid #edf1f5;
          margin-top: 22px;
          padding-top: 18px;
          flex-wrap: wrap;
        }

        .tm-form-note {
          font-size: 12px;
          color: #8492a3;
        }

        .tm-submit {
          border: 0;
          border-radius: 9px;
          padding: 12px 24px;
          color: white;
          background: linear-gradient(135deg, #123b5d, #1e6795);
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
          box-shadow: 0 5px 12px rgba(18, 59, 93, 0.16);
        }

        .tm-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 7px 16px rgba(18, 59, 93, 0.23);
        }

        .tm-submit:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .tm-alert {
          padding: 12px 15px;
          border-radius: 9px;
          margin-bottom: 18px;
          font-size: 13px;
          font-weight: 600;
        }

        .tm-alert.error {
          color: #a52c2c;
          background: #fff0f0;
          border: 1px solid #f6d1d1;
        }

        .tm-alert.success {
          color: #167344;
          background: #ecf9f1;
          border: 1px solid #c9eed8;
        }

        .tm-table-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .tm-table-count {
          color: #7b899a;
          font-size: 12px;
        }

        .tm-search {
          width: min(280px, 100%);
          position: relative;
        }

        .tm-search input {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #dce4ec;
          border-radius: 9px;
          background: #fbfcfe;
          padding: 10px 36px 10px 12px;
          font-family: inherit;
          font-size: 12px;
          outline: none;
        }

        .tm-search input:focus {
          border-color: #367ba6;
        }

        .tm-search-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #8a99a9;
        }

        .tm-table-wrap {
          overflow-x: auto;
          border: 1px solid #edf1f5;
          border-radius: 10px;
        }

        .tm-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 690px;
        }

        .tm-table th {
          background: #f5f8fb;
          color: #52677e;
          font-size: 12px;
          font-weight: 800;
          text-align: right;
          padding: 15px 14px;
          white-space: nowrap;
        }

        .tm-table td {
          padding: 14px;
          border-top: 1px solid #edf1f5;
          color: #40566d;
          font-size: 12px;
        }

        .tm-table tbody tr {
          transition: background 0.15s;
        }

        .tm-table tbody tr:hover {
          background: #f8fbfe;
        }

        .tm-request-number {
          color: #1e5b85;
          font-weight: 800;
          white-space: nowrap;
        }

        .tm-task-name {
          color: #263e56;
          font-weight: 700;
        }

        .tm-employee {
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }

        .tm-avatar {
          width: 27px;
          height: 27px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #eaf2f8;
          color: #1e5b85;
          font-size: 11px;
          font-weight: 800;
        }

        .tm-status {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .tm-status.pending { color: #a96a12; background: #fff4df; }
        .tm-status.progress { color: #276ca4; background: #e9f3fc; }
        .tm-status.completed { color: #16804b; background: #e6f7ed; }
        .tm-status.cancelled { color: #a43e3e; background: #fdecec; }

        .tm-date {
          color: #718096;
          white-space: nowrap;
        }

        .tm-empty {
          text-align: center;
          padding: 42px 15px;
          color: #8795a5;
        }

        .tm-empty-icon {
          font-size: 32px;
          margin-bottom: 10px;
        }

        .tm-empty strong {
          display: block;
          color: #52677e;
          font-size: 14px;
          margin-bottom: 6px;
        }

        .tm-empty p {
          font-size: 12px;
          margin: 0;
        }

        @media (max-width: 900px) {
          .tm-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .tm-heading h1 { font-size: 21px; }
          .tm-main-icon { width: 46px; height: 46px; }
          .tm-stats { gap: 9px; }
          .tm-stat { padding: 12px; gap: 9px; }
          .tm-stat-icon { width: 36px; height: 36px; font-size: 17px; }
          .tm-stat-number { font-size: 20px; }
          .tm-stat-label { font-size: 11px; }
          .tm-card { padding: 15px; }
          .tm-form-grid { grid-template-columns: 1fr; gap: 15px; }
          .tm-field.full { grid-column: auto; }
          .tm-form-footer { align-items: stretch; flex-direction: column; }
          .tm-submit { width: 100%; }
          .tm-table-toolbar { align-items: stretch; flex-direction: column; }
          .tm-search { width: 100%; }
        }
      `}</style>

      <div className="tm-heading">
        <div className="tm-title-area">
          <div className="tm-main-icon">▤</div>
          <div>
            <h1>توزيع المهام</h1>
            <p>إدارة وتوزيع الأعمال على موظفي الأقسام ومتابعة التنفيذ</p>
          </div>
        </div>

        <div className="tm-department-label">
          {departments.find((item) => item.id === departmentId)?.name ||
            "إدارة المهام"}
        </div>
      </div>

      <div className="tm-stats">
        <div className="tm-stat">
          <div className="tm-stat-icon blue">▤</div>
          <div>
            <div className="tm-stat-label">إجمالي المهام</div>
            <div className="tm-stat-number">{statistics.total}</div>
          </div>
        </div>

        <div className="tm-stat">
          <div className="tm-stat-icon orange">◷</div>
          <div>
            <div className="tm-stat-label">لم تبدأ</div>
            <div className="tm-stat-number">{statistics.pending}</div>
          </div>
        </div>

        <div className="tm-stat">
          <div className="tm-stat-icon purple">↻</div>
          <div>
            <div className="tm-stat-label">جاري التنفيذ</div>
            <div className="tm-stat-number">{statistics.progress}</div>
          </div>
        </div>

        <div className="tm-stat">
          <div className="tm-stat-icon green">✓</div>
          <div>
            <div className="tm-stat-label">مهام مكتملة</div>
            <div className="tm-stat-number">{statistics.completed}</div>
          </div>
        </div>
      </div>

      <section className="tm-card">
        <div className="tm-card-heading">
          <div className="tm-card-icon">＋</div>
          <div>
            <h2>توزيع مهمة جديدة</h2>
            <p>حدد الطلب والقسم والموظف المسؤول عن تنفيذ المهمة</p>
          </div>
        </div>

        {error && <div className="tm-alert error">⚠ {error}</div>}
        {success && <div className="tm-alert success">✓ {success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="tm-form-grid">
            <div className="tm-field">
              <label htmlFor="departmentId">
                القسم <span>*</span>
              </label>
              <select
                id="departmentId"
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
                required
                disabled={departments.length === 0}
              >
                <option value="">اختر القسم</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="tm-field">
              <label htmlFor="requestId">
                الطلب <span>*</span>
              </label>
              <select
                id="requestId"
                value={requestId}
                onChange={(event) => setRequestId(event.target.value)}
                required
                disabled={!departmentId}
              >
                <option value="">اختر الطلب</option>
                {departmentRequests.map((request) => (
                  <option key={request.id} value={request.id}>
                    {request.requestNumber} -{" "}
                    {request.customer?.name || "عميل"} - {request.serviceName}
                  </option>
                ))}
              </select>

              {departmentId && departmentRequests.length === 0 && (
                <small>لا توجد طلبات محولة لهذا القسم حاليًا.</small>
              )}
            </div>

            <div className="tm-field">
              <label htmlFor="taskName">
                اسم المهمة <span>*</span>
              </label>
              <select
                id="taskName"
                value={taskName}
                onChange={(event) => setTaskName(event.target.value)}
                required
              >
                <option value="">اختر نوع المهمة</option>
                {availableTaskNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {taskName === "مهمة أخرى" && (
              <div className="tm-field">
                <label htmlFor="customTaskName">
                  اسم المهمة الجديدة <span>*</span>
                </label>
                <input
                  id="customTaskName"
                  value={customTaskName}
                  onChange={(event) => setCustomTaskName(event.target.value)}
                  placeholder="اكتب اسم المهمة"
                  required
                  maxLength={120}
                />
              </div>
            )}

            <div className="tm-field">
              <label htmlFor="assignedToId">
                الموظف المسؤول <span>*</span>
              </label>
              <select
                id="assignedToId"
                value={assignedToId}
                onChange={(event) => setAssignedToId(event.target.value)}
                required
                disabled={!departmentId || employees.length === 0}
              >
                <option value="">اختر الموظف</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
              {departmentId && employees.length === 0 && (
                <small>لا يوجد موظفون متاحون في هذا القسم.</small>
              )}
            </div>

            <div className="tm-field">
              <label htmlFor="expectedEndAt">موعد الانتهاء المتوقع</label>
              <input
                id="expectedEndAt"
                type="date"
                value={expectedEndAt}
                onChange={(event) => setExpectedEndAt(event.target.value)}
              />
            </div>

            <div className="tm-field full">
              <label htmlFor="instructions">تعليمات وتفاصيل المهمة</label>
              <textarea
                id="instructions"
                rows={4}
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                placeholder="اكتب التعليمات والتفاصيل المطلوبة من الموظف..."
              />
            </div>
          </div>

          <div className="tm-form-footer">
            <span className="tm-form-note">
              الحقول المشار إليها بعلامة * إلزامية
            </span>
            <button
              type="submit"
              className="tm-submit"
              disabled={
                saving ||
                !departmentId ||
                !requestId ||
                !assignedToId ||
                employees.length === 0
              }
            >
              {saving ? "جاري توزيع المهمة..." : "＋  تأكيد وتوزيع المهمة"}
            </button>
          </div>
        </form>
      </section>

      <section className="tm-card">
        <div className="tm-card-heading">
          <div className="tm-card-icon">☷</div>
          <div>
            <h2>المهام المسجلة</h2>
            <p>عرض ومتابعة المهام التابعة للقسم المحدد</p>
          </div>
        </div>

        <div className="tm-table-toolbar">
          <span className="tm-table-count">
            عدد المهام المعروضة: {filteredTasks.length}
          </span>

          <div className="tm-search">
            <span className="tm-search-icon">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث برقم الطلب أو المهمة أو الموظف..."
            />
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="tm-empty">
            <div className="tm-empty-icon">▤</div>
            <strong>
              {tasks.length === 0
                ? "لا توجد مهام مسجلة حتى الآن"
                : "لا توجد نتائج مطابقة للبحث"}
            </strong>
            <p>
              {tasks.length === 0
                ? "ستظهر المهام هنا بمجرد توزيعها على موظفي القسم."
                : "جرّب البحث باستخدام كلمة أو رقم طلب مختلف."}
            </p>
          </div>
        ) : (
          <div className="tm-table-wrap">
            <table className="tm-table">
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>اسم المهمة</th>
                  <th>الموظف المسؤول</th>
                  <th>الحالة</th>
                  <th>موعد الانتهاء</th>
                </tr>
              </thead>

              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <span className="tm-request-number">
                        {task.request.requestNumber}
                      </span>
                    </td>

                    <td>
                      <span className="tm-task-name">{task.title}</span>
                    </td>

                    <td>
                      <div className="tm-employee">
                        <span className="tm-avatar">
                          {task.assignedTo?.name?.charAt(0) || "؟"}
                        </span>
                        {task.assignedTo?.name || "غير محدد"}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`tm-status ${
                          statusClasses[task.status] || "pending"
                        }`}
                      >
                        {statusLabels[task.status] || task.status}
                      </span>
                    </td>

                    <td>
                      <span className="tm-date">
                        {task.expectedEndAt
                          ? new Date(task.expectedEndAt).toLocaleDateString(
                              "ar-EG"
                            )
                          : "غير محدد"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
