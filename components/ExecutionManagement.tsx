
"use client";

import { useCallback, useEffect, useState } from "react";

type Step = {
  id: string;
  title: string;
  notes: string | null;
  status: string;
  order: number;
};

type Task = {
  id: string;
  title: string;
  instructions: string | null;
  status: string;
  startedAt: string | null;
  expectedEndAt: string | null;
  completedAt: string | null;
  request: {
    id: string;
    requestNumber: string;
    serviceName: string;
    customer: { name: string };
  };
  department: { name: string };
  assignedTo: { id: string; name: string } | null;
  steps: Step[];
};

const statusLabels: Record<string, string> = {
  PENDING: "لم تبدأ",
  IN_PROGRESS: "جاري التنفيذ",
  PAUSED: "متوقفة",
  COMPLETED: "مكتملة",
};

export default function ExecutionManagement() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expenseAmounts, setExpenseAmounts] = useState<Record<string, string>>({});
  const [expenseDescriptions, setExpenseDescriptions] = useState<Record<string, string>>({});
  const [stepNotes, setStepNotes] = useState<Record<string, string>>({});

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/execution", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر تحميل المهام");
      }

      setTasks(result.tasks || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء تحميل المهام"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  async function performAction(payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/execution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر تنفيذ العملية");
      }

      setMessage(result.message || "تم تنفيذ العملية بنجاح");
      await loadTasks();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء تنفيذ العملية"
      );
    } finally {
      setBusy(false);
    }
  }

  const total = tasks.length;
  const completed = tasks.filter((task) => task.status === "COMPLETED").length;
  const inProgress = tasks.filter((task) => task.status === "IN_PROGRESS").length;
  const pending = tasks.filter((task) => task.status === "PENDING").length;

  return (
    <div className="em-container" dir="rtl">
      <style jsx>{`
        .em-container {
          display: grid;
          gap: 20px;
          color: #17324a;
        }
        .em-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }
        .em-stat, .em-card {
          background: #fff;
          border: 1px solid #e5ebf1;
          border-radius: 14px;
          padding: 18px;
        }
        .em-stat span {
          display: block;
          color: #718096;
          font-size: 13px;
        }
        .em-stat strong {
          display: block;
          font-size: 26px;
          margin-top: 8px;
        }
        .em-card {
          display: grid;
          gap: 16px;
        }
        .em-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .em-heading h3 {
          margin: 0 0 6px;
          font-size: 18px;
        }
        .em-muted {
          color: #718096;
          font-size: 13px;
        }
        .em-badge {
          background: #edf2f7;
          padding: 7px 12px;
          border-radius: 20px;
          font-size: 12px;
        }
        .em-actions, .em-form {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .em-button {
          border: 0;
          border-radius: 8px;
          padding: 9px 14px;
          cursor: pointer;
          background: #1e5b85;
          color: white;
          font-weight: 600;
        }
        .em-button.secondary {
          background: #eaf0f5;
          color: #23445e;
        }
        .em-button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }
        .em-step {
          border: 1px solid #e5ebf1;
          border-radius: 10px;
          padding: 12px;
          display: grid;
          gap: 10px;
        }
        .em-step-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .em-input, .em-select, .em-textarea {
          border: 1px solid #d8e0e8;
          border-radius: 8px;
          padding: 10px;
          font: inherit;
          min-width: 0;
        }
        .em-textarea {
          width: 100%;
          resize: vertical;
        }
        .em-form input {
          flex: 1;
          min-width: 130px;
        }
        .em-alert {
          border-radius: 9px;
          padding: 12px;
          background: #fff1f0;
          color: #a12b25;
        }
        .em-success {
          border-radius: 9px;
          padding: 12px;
          background: #edf8f0;
          color: #23683a;
        }
        .em-empty {
          text-align: center;
          color: #718096;
          padding: 35px 10px;
        }
        @media (max-width: 700px) {
          .em-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
      `}</style>

      <div className="em-stats">
        <div className="em-stat">
          <span>إجمالي المهام</span>
          <strong>{total}</strong>
        </div>
        <div className="em-stat">
          <span>لم تبدأ</span>
          <strong>{pending}</strong>
        </div>
        <div className="em-stat">
          <span>جاري التنفيذ</span>
          <strong>{inProgress}</strong>
        </div>
        <div className="em-stat">
          <span>مكتملة</span>
          <strong>{completed}</strong>
        </div>
      </div>

      {error && <div className="em-alert">{error}</div>}
      {message && <div className="em-success">{message}</div>}

      <div className="em-heading">
        <div>
          <h2>متابعة تنفيذ المهام</h2>
          <span className="em-muted">
            المهام المسندة إليك أو التابعة للقسم حسب صلاحيتك
          </span>
        </div>

        <button className="em-button secondary" onClick={loadTasks} disabled={loading}>
          تحديث القائمة
        </button>
      </div>

      {loading ? (
        <div className="em-card em-empty">جاري تحميل المهام...</div>
      ) : tasks.length === 0 ? (
        <div className="em-card em-empty">
          لا توجد مهام متاحة للتنفيذ حاليًا.
        </div>
      ) : (
        tasks.map((task) => (
          <section className="em-card" key={task.id}>
            <div className="em-heading">
              <div>
                <h3>{task.title}</h3>
                <div className="em-muted">
                  الطلب: {task.request.requestNumber} — {task.request.customer.name}
                </div>
                <div className="em-muted">
                  الخدمة: {task.request.serviceName} — القسم: {task.department.name}
                </div>
                <div className="em-muted">
                  الموظف: {task.assignedTo?.name || "غير محدد"}
                </div>
              </div>

              <span className="em-badge">
                {statusLabels[task.status] || task.status}
              </span>
            </div>

            {task.instructions && (
              <div>
                <strong>التعليمات:</strong>
                <p className="em-muted">{task.instructions}</p>
              </div>
            )}

            <div className="em-muted">
              موعد الانتهاء المتوقع:{" "}
              {task.expectedEndAt
                ? new Date(task.expectedEndAt).toLocaleDateString("ar-EG")
                : "غير محدد"}
            </div>

            <div className="em-actions">
              {task.status !== "COMPLETED" && (
                <button
                  className="em-button"
                  disabled={busy}
                  onClick={() =>
                    performAction({ action: "START", taskId: task.id })
                  }
                >
                  {task.status === "IN_PROGRESS" ? "تحديث بدء التنفيذ" : "بدء التنفيذ"}
                </button>
              )}

              <button
                className="em-button secondary"
                onClick={() =>
                  setExpanded(expanded === task.id ? null : task.id)
                }
              >
                {expanded === task.id ? "إخفاء التفاصيل" : "عرض تفاصيل التنفيذ"}
              </button>

              {task.status !== "COMPLETED" && (
                <button
                  className="em-button"
                  disabled={busy}
                  onClick={() =>
                    performAction({ action: "COMPLETE", taskId: task.id })
                  }
                >
                  إنهاء المهمة
                </button>
              )}
            </div>

            {expanded === task.id && (
              <div className="em-container">
                <h4>خطوات التنفيذ</h4>

                {task.steps.length === 0 ? (
                  <p className="em-muted">
                    لا توجد خطوات محددة في قالب هذه المهمة. يمكنك إنهاؤها مباشرة.
                  </p>
                ) : (
                  task.steps.map((step) => (
                    <div className="em-step" key={step.id}>
                      <div className="em-step-top">
                        <strong>
                          {step.order}. {step.title}
                        </strong>
                        <span className="em-badge">
                          {statusLabels[step.status] || step.status}
                        </span>
                      </div>

                      <textarea
                        className="em-textarea"
                        rows={2}
                        placeholder="ملاحظات تنفيذ الخطوة"
                        value={stepNotes[step.id] ?? step.notes ?? ""}
                        onChange={(event) =>
                          setStepNotes((current) => ({
                            ...current,
                            [step.id]: event.target.value,
                          }))
                        }
                        disabled={task.status === "COMPLETED"}
                      />

                      {task.status !== "COMPLETED" && (
                        <div className="em-actions">
                          <select
                            className="em-select"
                            value={step.status}
                            onChange={(event) =>
                              performAction({
                                action: "UPDATE_STEP",
                                taskId: task.id,
                                stepId: step.id,
                                stepStatus: event.target.value,
                                stepNotes: stepNotes[step.id] ?? step.notes ?? "",
                              })
                            }
                            disabled={busy}
                          >
                            <option value="PENDING">لم تبدأ</option>
                            <option value="IN_PROGRESS">جاري التنفيذ</option>
                            <option value="COMPLETED">مكتملة</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ))
                )}

                {task.status !== "COMPLETED" && (
                  <>
                    <h4>تسجيل مصروف</h4>
                    <div className="em-form">
                      <input
                        className="em-input"
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="المبلغ"
                        value={expenseAmounts[task.id] || ""}
                        onChange={(event) =>
                          setExpenseAmounts((current) => ({
                            ...current,
                            [task.id]: event.target.value,
                          }))
                        }
                      />

                      <input
                        className="em-input"
                        placeholder="وصف المصروف"
                        value={expenseDescriptions[task.id] || ""}
                        onChange={(event) =>
                          setExpenseDescriptions((current) => ({
                            ...current,
                            [task.id]: event.target.value,
                          }))
                        }
                      />

                      <button
                        className="em-button"
                        disabled={busy}
                        onClick={async () => {
                          await performAction({
                            action: "ADD_EXPENSE",
                            taskId: task.id,
                            amount: expenseAmounts[task.id],
                            expenseDescription: expenseDescriptions[task.id],
                          });

                          setExpenseAmounts((current) => ({
                            ...current,
                            [task.id]: "",
                          }));
                          setExpenseDescriptions((current) => ({
                            ...current,
                            [task.id]: "",
                          }));
                        }}
                      >
                        تسجيل المصروف
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}
