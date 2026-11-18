
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams } from "next/navigation";

type TaskStep = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  notes?: string | null;
};

type WorkSession = {
  id: string;
  startedAt: string;
  stoppedAt: string | null;
  durationSeconds?: number | null;
};

type TaskExpense = {
  id: string;
  amount: number;
  description: string;
  createdAt: string;
  employee?: { name: string } | null;
};

type ExecutionTask = {
  id: string;
  title: string;
  status: string;
  description?: string | null;
  instructions?: string | null;
  createdAt: string;
  expectedEndAt: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  request: {
    id: string;
    requestNumber: string;
    serviceName: string;
    customer: { name: string } | null;
  };
  department: { id: string; name: string };
  assignedTo: { id: string; name: string } | null;
  steps: TaskStep[];
  workSessions: WorkSession[];
  expenses?: TaskExpense[];
};

const statusLabels: Record<string, string> = {
  PENDING: "لم تبدأ",
  IN_PROGRESS: "جاري التنفيذ",
  COMPLETED: "مكتملة",
  APPROVED: "تم اعتمادها",
  REJECTED: "مرفوضة",
  CANCELLED: "ملغاة",
};

const stepStatusLabels: Record<string, string> = {
  PENDING: "لم تبدأ",
  IN_PROGRESS: "جاري التنفيذ",
  COMPLETED: "مكتملة",
};

function formatDate(value?: string | null) {
  if (!value) return "غير محدد";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "غير محدد";

  return date.toLocaleString("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getSessionSeconds(session: WorkSession) {
  if (typeof session.durationSeconds === "number") {
    return session.durationSeconds;
  }

  const start = new Date(session.startedAt).getTime();
  const end = session.stoppedAt
    ? new Date(session.stoppedAt).getTime()
    : Date.now();

  if (Number.isNaN(start) || Number.isNaN(end)) return 0;

  return Math.max(0, Math.floor((end - start) / 1000));
}

function ExecutionContent() {
  const params = useParams<{ id: string }>();
  const taskId = params.id;

  const [task, setTask] = useState<ExecutionTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [currentTime, setCurrentTime] = useState(Date.now());

  const loadTask = useCallback(async () => {
    try {
      setError("");

      const response = await fetch("/api/execution", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر تحميل بيانات التنفيذ");
      }

      const tasks: ExecutionTask[] = result.tasks || [];
      const currentTask = tasks.find((item) => item.id === taskId);

      if (!currentTask) {
        setTask(null);
        throw new Error("المهمة غير موجودة أو ليس لديك صلاحية لعرضها");
      }

      setTask(currentTask);

      const savedNotes: Record<string, string> = {};

      for (const step of currentTask.steps || []) {
        savedNotes[step.id] = step.notes || "";
      }

      setNotes(savedNotes);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء تحميل المهمة"
      );
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const activeSession = useMemo(
    () => task?.workSessions?.find((session) => !session.stoppedAt) || null,
    [task]
  );

  const totalSeconds = useMemo(
    () =>
      task?.workSessions?.reduce((total, session) => {
        const start = new Date(session.startedAt).getTime();

        const end = session.stoppedAt
          ? new Date(session.stoppedAt).getTime()
          : currentTime;

        if (Number.isNaN(start) || Number.isNaN(end)) return total;

        return total + Math.max(0, Math.floor((end - start) / 1000));
      }, 0) || 0,
    [task, currentTime]
  );

  const completedSteps = useMemo(
    () =>
      task?.steps?.filter((step) => step.status === "COMPLETED").length || 0,
    [task]
  );

  const totalSteps = task?.steps?.length || 0;

  const progress = totalSteps
    ? Math.round((completedSteps / totalSteps) * 100)
    : 0;

  const totalExpenses = useMemo(
    () =>
      task?.expenses?.reduce(
        (total, expense) => total + Number(expense.amount || 0),
        0
      ) || 0,
    [task]
  );

  const isCompleted =
    task?.status === "COMPLETED" ||
    task?.status === "APPROVED" ||
    task?.status === "CANCELLED";

  async function performAction(
    action: string,
    extra: Record<string, unknown> = {}
  ) {
    if (!task) return false;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/execution", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          taskId: task.id,
          ...extra,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر تنفيذ العملية");
      }

      await loadTask();

      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء تنفيذ العملية"
      );

      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleStepStatusChange(
    stepId: string,
    stepStatus: string
  ) {
    const success = await performAction("UPDATE_STEP", {
      stepId,
      stepStatus,
      stepNotes: notes[stepId] || "",
    });

    if (success) {
      setSuccess("تم تحديث خطوة التنفيذ بنجاح");
    }
  }

  async function handleSaveStepNotes(stepId: string) {
    if (!task) return;

    const step = task.steps.find((item) => item.id === stepId);

    if (!step) return;

    const success = await performAction("UPDATE_STEP", {
      stepId,
      stepStatus: step.status,
      stepNotes: notes[stepId] || "",
    });

    if (success) {
      setSuccess("تم حفظ الملاحظات بنجاح");
    }
  }

  async function handleAddExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = Number(expenseAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("من فضلك أدخل قيمة مصروف صحيحة");
      return;
    }

    if (!expenseDescription.trim()) {
      setError("من فضلك اكتب وصف المصروف");
      return;
    }

    const success = await performAction("ADD_EXPENSE", {
      amount,
      expenseDescription: expenseDescription.trim(),
    });

    if (success) {
      setExpenseAmount("");
      setExpenseDescription("");
      setSuccess("تم تسجيل المصروف بنجاح");
    }
  }

  async function handleCompleteTask() {
    if (!task) return;

    const unfinishedSteps = task.steps.filter(
      (step) => step.status !== "COMPLETED"
    );

    if (unfinishedSteps.length > 0) {
      setError("يجب إكمال جميع خطوات المهمة قبل إرسالها للمراجعة");
      return;
    }

    const confirmed = window.confirm(
      "هل أنت متأكد من إكمال المهمة وإرسالها للمراجعة؟"
    );

    if (!confirmed) return;

    const success = await performAction("COMPLETE");

    if (success) {
      setSuccess("تم إكمال المهمة وإرسالها للمراجعة بنجاح");
    }
  }

  if (loading) {
    return (
      <div className="ex-loading" dir="rtl">
        <div className="ex-spinner" />
        <p>جاري تحميل بيانات المهمة...</p>

        <style jsx>{`
          .ex-loading {
            min-height: 300px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 14px;
            color: #64748b;
          }

          .ex-spinner {
            width: 38px;
            height: 38px;
            border: 4px solid #e2e8f0;
            border-top-color: #1e5b85;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (!task) {
    return (
      <main className="ex-page" dir="rtl">
        <div className="ex-alert error">
          {error || "المهمة غير موجودة"}
        </div>
      </main>
    );
  }

  return (
    <main className="ex-page" dir="rtl">
      <style jsx>{`
        .ex-page {
          width: 100%;
          color: #172b45;
          padding-bottom: 35px;
        }

        .ex-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
          margin-bottom: 22px;
        }

        .ex-heading h1 {
          margin: 0 0 7px;
          color: #123b5d;
          font-size: 25px;
          font-weight: 800;
        }

        .ex-heading p {
          margin: 0;
          color: #718096;
          font-size: 13px;
        }

        .ex-heading-icon {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          color: white;
          font-size: 24px;
          background: linear-gradient(135deg, #123b5d, #2878a8);
        }

        .ex-heading-title {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .ex-status {
          display: inline-flex;
          align-items: center;
          padding: 8px 13px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 800;
          background: #eaf2f8;
          color: #1e5b85;
        }

        .ex-status.completed,
        .ex-status.approved {
          background: #e6f7ed;
          color: #16804b;
        }

        .ex-status.rejected,
        .ex-status.cancelled {
          background: #fdecec;
          color: #a43e3e;
        }

        .ex-alert {
          padding: 13px 15px;
          border-radius: 9px;
          margin-bottom: 17px;
          font-size: 13px;
          font-weight: 600;
        }

        .ex-alert.error {
          background: #fff0f0;
          color: #a52c2c;
          border: 1px solid #f6d1d1;
        }

        .ex-alert.success {
          background: #ecf9f1;
          color: #167344;
          border: 1px solid #c9eed8;
        }

        .ex-card {
          background: white;
          border: 1px solid #e8edf3;
          border-radius: 14px;
          padding: 22px;
          margin-bottom: 19px;
          box-shadow: 0 3px 14px rgba(15, 40, 70, 0.035);
        }

        .ex-card-title {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-bottom: 15px;
          margin-bottom: 17px;
          border-bottom: 1px solid #edf1f5;
        }

        .ex-card-title h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          color: #123b5d;
        }

        .ex-card-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: #edf4fa;
          color: #1e5b85;
          font-size: 18px;
        }

        .ex-info-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .ex-info-item {
          background: #f8fafc;
          border: 1px solid #edf1f5;
          border-radius: 10px;
          padding: 13px;
          min-width: 0;
        }

        .ex-info-label {
          color: #8190a2;
          font-size: 11px;
          margin-bottom: 7px;
        }

        .ex-info-value {
          color: #263e56;
          font-size: 13px;
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .ex-description {
          margin-top: 17px;
          padding: 14px;
          background: #f8fafc;
          border-radius: 10px;
          color: #52677e;
          font-size: 13px;
          line-height: 1.8;
          white-space: pre-wrap;
        }

        .ex-timer-area {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }

        .ex-timer-label {
          color: #8190a2;
          font-size: 12px;
          margin-bottom: 7px;
        }

        .ex-timer {
          direction: ltr;
          font-size: 31px;
          font-weight: 800;
          color: #123b5d;
          font-variant-numeric: tabular-nums;
          letter-spacing: 1px;
        }

        .ex-timer-active {
          color: #16804b;
        }

        .ex-timer-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .ex-button {
          border: 0;
          border-radius: 9px;
          padding: 11px 19px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s;
        }

        .ex-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .ex-button.primary {
          background: #1e5b85;
          color: white;
        }

        .ex-button.success {
          background: #16804b;
          color: white;
        }

        .ex-button.danger {
          background: #a43e3e;
          color: white;
        }

        .ex-button.secondary {
          background: #edf4fa;
          color: #1e5b85;
        }

        .ex-button:hover:not(:disabled) {
          filter: brightness(0.95);
          transform: translateY(-1px);
        }

        .ex-progress-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
          color: #52677e;
          font-size: 12px;
          font-weight: 700;
        }

        .ex-progress-track {
          height: 10px;
          overflow: hidden;
          background: #edf1f5;
          border-radius: 20px;
        }

        .ex-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #1e5b85, #35a078);
          border-radius: 20px;
          transition: width 0.3s;
        }

        .ex-step {
          border: 1px solid #e8edf3;
          border-radius: 11px;
          padding: 16px;
          margin-bottom: 13px;
        }

        .ex-step:last-child {
          margin-bottom: 0;
        }

        .ex-step-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .ex-step-title {
          color: #263e56;
          font-size: 14px;
          font-weight: 800;
        }

        .ex-step-description {
          color: #8190a2;
          font-size: 12px;
          margin-top: 6px;
          line-height: 1.7;
        }

        .ex-step-status {
          border: 1px solid #dce4ec;
          border-radius: 8px;
          padding: 8px 10px;
          color: #344b63;
          background: #fbfcfe;
          font-family: inherit;
          font-size: 12px;
          min-width: 135px;
        }

        .ex-step textarea,
        .ex-expense-form input,
        .ex-expense-form textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #dce4ec;
          background: #fbfcfe;
          border-radius: 9px;
          padding: 11px 12px;
          color: #263d55;
          font-family: inherit;
          font-size: 12px;
          outline: none;
        }

        .ex-step textarea {
          min-height: 65px;
          resize: vertical;
        }

        .ex-step textarea:focus,
        .ex-expense-form input:focus,
        .ex-expense-form textarea:focus {
          border-color: #367ba6;
          box-shadow: 0 0 0 3px rgba(54, 123, 166, 0.1);
        }

        .ex-step-footer {
          display: flex;
          justify-content: flex-end;
          margin-top: 9px;
        }

        .ex-expense-form {
          display: grid;
          grid-template-columns: 180px minmax(0, 1fr) auto;
          gap: 12px;
          align-items: end;
        }

        .ex-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }

        .ex-field label {
          color: #344b63;
          font-size: 12px;
          font-weight: 700;
        }

        .ex-expense-form textarea {
          min-height: 42px;
          resize: vertical;
        }

        .ex-expense-summary {
          margin-top: 16px;
          padding: 13px;
          background: #f8fafc;
          border-radius: 9px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: #52677e;
          font-size: 12px;
        }

        .ex-expense-summary strong {
          color: #123b5d;
          font-size: 15px;
        }

        .ex-expense-list {
          margin-top: 14px;
        }

        .ex-expense-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #edf1f5;
          font-size: 12px;
        }

        .ex-expense-row:last-child {
          border-bottom: 0;
        }

        .ex-expense-name {
          color: #40566d;
          font-weight: 700;
        }

        .ex-expense-date {
          color: #8190a2;
          font-size: 11px;
          margin-top: 5px;
        }

        .ex-expense-amount {
          color: #123b5d;
          font-weight: 800;
          white-space: nowrap;
        }

        .ex-empty {
          padding: 25px 10px;
          text-align: center;
          color: #8795a5;
          font-size: 12px;
        }

        .ex-complete-area {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          flex-wrap: wrap;
        }

        .ex-complete-area p {
          margin: 0;
          color: #718096;
          font-size: 12px;
          line-height: 1.7;
        }

        .ex-complete-area strong {
          color: #123b5d;
        }

        @media (max-width: 800px) {
          .ex-info-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ex-expense-form {
            grid-template-columns: 1fr 1fr;
          }

          .ex-expense-form .ex-field:nth-child(2) {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 550px) {
          .ex-heading h1 {
            font-size: 21px;
          }

          .ex-card {
            padding: 15px;
          }

          .ex-info-grid {
            grid-template-columns: 1fr;
            gap: 9px;
          }

          .ex-timer-area {
            align-items: stretch;
            flex-direction: column;
          }

          .ex-timer-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .ex-timer-actions .ex-button {
            padding: 11px 8px;
          }

          .ex-step-top {
            flex-direction: column;
          }

          .ex-step-status {
            width: 100%;
          }

          .ex-expense-form {
            grid-template-columns: 1fr;
          }

          .ex-expense-form .ex-field:nth-child(2) {
            grid-column: auto;
          }

          .ex-expense-form .ex-button {
            width: 100%;
          }

          .ex-complete-area {
            align-items: stretch;
            flex-direction: column;
          }

          .ex-complete-area .ex-button {
            width: 100%;
          }
        }
      `}</style>

      <div className="ex-heading">
        <div className="ex-heading-title">
          <div className="ex-heading-icon">⚙</div>
          <div>
            <h1>تنفيذ المهمة</h1>
            <p>متابعة خطوات العمل وتسجيل الوقت والمصروفات</p>
          </div>
        </div>

        <span className={`ex-status ${task.status.toLowerCase()}`}>
          {statusLabels[task.status] || task.status}
        </span>
      </div>

      {error && <div className="ex-alert error">⚠ {error}</div>}
      {success && <div className="ex-alert success">✓ {success}</div>}

      <section className="ex-card">
        <div className="ex-card-title">
          <div className="ex-card-icon">▤</div>
          <h2>بيانات المهمة والطلب</h2>
        </div>

        <div className="ex-info-grid">
          <div className="ex-info-item">
            <div className="ex-info-label">اسم المهمة</div>
            <div className="ex-info-value">{task.title}</div>
          </div>

          <div className="ex-info-item">
            <div className="ex-info-label">رقم الطلب</div>
            <div className="ex-info-value">
              {task.request?.requestNumber || "غير محدد"}
            </div>
          </div>

          <div className="ex-info-item">
            <div className="ex-info-label">الخدمة</div>
            <div className="ex-info-value">
              {task.request?.serviceName || "غير محدد"}
            </div>
          </div>

          <div className="ex-info-item">
            <div className="ex-info-label">العميل</div>
            <div className="ex-info-value">
              {task.request?.customer?.name || "غير محدد"}
            </div>
          </div>

          <div className="ex-info-item">
            <div className="ex-info-label">القسم</div>
            <div className="ex-info-value">
              {task.department?.name || "غير محدد"}
            </div>
          </div>

          <div className="ex-info-item">
            <div className="ex-info-label">الموظف المسؤول</div>
            <div className="ex-info-value">
              {task.assignedTo?.name || "غير محدد"}
            </div>
          </div>

          <div className="ex-info-item">
            <div className="ex-info-label">تاريخ إنشاء المهمة</div>
            <div className="ex-info-value">{formatDate(task.createdAt)}</div>
          </div>

          <div className="ex-info-item">
            <div className="ex-info-label">موعد الانتهاء المتوقع</div>
            <div className="ex-info-value">
              {formatDate(task.expectedEndAt)}
            </div>
          </div>
        </div>

        {(task.instructions || task.description) && (
          <div className="ex-description">
            **تعليمات المهمة:**
            {"\n"}
            {task.instructions || task.description}
          </div>
        )}
      </section>

      <section className="ex-card">
        <div className="ex-card-title">
          <div className="ex-card-icon">◷</div>
          <h2>تسجيل وقت العمل</h2>
        </div>

        <div className="ex-timer-area">
          <div>
            <div className="ex-timer-label">إجمالي وقت العمل المسجل</div>
            <div className={`ex-timer ${activeSession ? "ex-timer-active" : ""}`}>
              {formatDuration(totalSeconds)}
            </div>
            <div className="ex-timer-label">
              {activeSession
                ? "● جلسة العمل الحالية نشطة"
                : "لا توجد جلسة عمل نشطة"}
            </div>
          </div>

          <div className="ex-timer-actions">
            <button
              className="ex-button success"
              disabled={saving || isCompleted || !!activeSession}
              onClick={() =>
                performAction("START").then((ok) => {
                  if (ok) setSuccess("بدأ تسجيل وقت العمل");
                })
              }
            >
              ▶ بدء العمل
            </button>

            <button
              className="ex-button danger"
              disabled={saving || isCompleted || !activeSession}
              onClick={() =>
                performAction("STOP").then((ok) => {
                  if (ok) setSuccess("تم إيقاف تسجيل وقت العمل");
                })
              }
            >
              ■ إيقاف العمل
            </button>
          </div>
        </div>
      </section>

      <section className="ex-card">
        <div className="ex-card-title">
          <div className="ex-card-icon">✓</div>
          <h2>خطوات تنفيذ المهمة</h2>
        </div>

        <div className="ex-progress-head">
          <span>نسبة الإنجاز</span>
          <span>
            {completedSteps} من {totalSteps} ({progress}%)
          </span>
        </div>

        <div className="ex-progress-track">
          <div
            className="ex-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div style={{ height: 18 }} />

        {task.steps.length === 0 ? (
          <div className="ex-empty">
            لا توجد خطوات تنفيذ مسجلة لهذه المهمة.
          </div>
        ) : (
          task.steps.map((step, index) => (
            <div className="ex-step" key={step.id}>
              <div className="ex-step-top">
                <div>
                  <div className="ex-step-title">
                    {index + 1}. {step.title}
                  </div>

                  {step.description && (
                    <div className="ex-step-description">
                      {step.description}
                    </div>
                  )}
                </div>

                <select
                  className="ex-step-status"
                  value={step.status}
                  disabled={saving || isCompleted}
                  onChange={(event) =>
                    handleStepStatusChange(step.id, event.target.value)
                  }
                >
                  <option value="PENDING">لم تبدأ</option>
                  <option value="IN_PROGRESS">جاري التنفيذ</option>
                  <option value="COMPLETED">مكتملة</option>
                </select>
              </div>

              <textarea
                value={notes[step.id] || ""}
                disabled={saving || isCompleted}
                onChange={(event) =>
                  setNotes((previous) => ({
                    ...previous,
                    [step.id]: event.target.value,
                  }))
                }
                placeholder="اكتب ملاحظات هذه الخطوة..."
              />

              <div className="ex-step-footer">
                <button
                  type="button"
                  className="ex-button secondary"
                  disabled={saving || isCompleted}
                  onClick={() => handleSaveStepNotes(step.id)}
                >
                  حفظ الملاحظات
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="ex-card">
        <div className="ex-card-title">
          <div className="ex-card-icon">ج</div>
          <h2>المصروفات الخاصة بالمهمة</h2>
        </div>

        {!isCompleted && (
          <form className="ex-expense-form" onSubmit={handleAddExpense}>
            <div className="ex-field">
              <label htmlFor="expenseAmount">قيمة المصروف</label>
              <input
                id="expenseAmount"
                type="number"
                min="0.01"
                step="0.01"
                value={expenseAmount}
                onChange={(event) => setExpenseAmount(event.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="ex-field">
              <label htmlFor="expenseDescription">وصف المصروف</label>
              <textarea
                id="expenseDescription"
                value={expenseDescription}
                onChange={(event) =>
                  setExpenseDescription(event.target.value)
                }
                placeholder="اكتب تفاصيل المصروف..."
                required
              />
            </div>

            <button
              type="submit"
              className="ex-button primary"
              disabled={saving}
            >
              ＋ تسجيل المصروف
            </button>
          </form>
        )}

        <div className="ex-expense-summary">
          <span>إجمالي المصروفات المسجلة</span>
          <strong>
            {totalExpenses.toLocaleString("ar-EG", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            ج.م
          </strong>
        </div>

        <div className="ex-expense-list">
          {!task.expenses?.length ? (
            <div className="ex-empty">لا توجد مصروفات مسجلة حتى الآن.</div>
          ) : (
            task.expenses.map((expense) => (
              <div className="ex-expense-row" key={expense.id}>
                <div>
                  <div className="ex-expense-name">
                    {expense.description}
                  </div>
                  <div className="ex-expense-date">
                    {formatDate(expense.createdAt)}
                    {expense.employee?.name
                      ? ` - ${expense.employee.name}`
                      : ""}
                  </div>
                </div>

                <div className="ex-expense-amount">
                  {Number(expense.amount).toLocaleString("ar-EG", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  ج.م
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="ex-card">
        <div className="ex-complete-area">
          <div>
            <strong>إرسال المهمة للمراجعة</strong>
            <p>
              يجب إكمال جميع خطوات المهمة قبل إرسالها للمراجعة.
              {" "}
              {completedSteps} من {totalSteps} خطوات مكتملة.
            </p>
          </div>

          <button
            className="ex-button primary"
            disabled={
              saving ||
              isCompleted ||
              !!activeSession ||
              task.steps.some((step) => step.status !== "COMPLETED")
            }
            onClick={handleCompleteTask}
          >
            {saving ? "جاري الإرسال..." : "✓ إكمال المهمة وإرسالها للمراجعة"}
          </button>
        </div>
      </section>
    </main>
  );
}

export default function ExecutionPage() {
  return (
    <Suspense
      fallback={
        <div
          dir="rtl"
          style={{
            minHeight: "300px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#64748b",
            fontFamily: "Tahoma, Arial, sans-serif",
          }}
        >
          جاري تحميل صفحة التنفيذ...
        </div>
      }
    >
      <ExecutionContent />
    </Suspense>
  );
}
