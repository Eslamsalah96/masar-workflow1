
"use client";

import { useCallback, useEffect, useState } from "react";

type ReviewActivity = {
  action: string;
  details: string | null;
  createdAt: string;
  user: {
    name: string;
  };
};

type ReviewTask = {
  id: string;
  title: string;
  status: string;
  instructions: string | null;
  updatedAt: string;
  request: {
    id: string;
    requestNumber: string;
    serviceName: string;
    customer: {
      name: string;
    };
  };
  department: {
    name: string;
  };
  assignedTo: {
    id: string;
    name: string;
  } | null;
  activities: ReviewActivity[];
};

export default function ReviewManagement() {
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("ALL");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/review", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر تحميل مهام المراجعة");
      }

      setTasks(data.tasks || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء تحميل البيانات"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  async function submitDecision(
    taskId: string,
    decision: "APPROVE" | "RETURN" | "REJECT"
  ) {
    const taskNotes = notes[taskId] || "";

    if (decision !== "APPROVE" && !taskNotes.trim()) {
      setError("اكتب سبب الإرجاع أو الرفض أولاً");
      return;
    }

    const confirmation =
      decision === "APPROVE"
        ? "هل تريد اعتماد هذه المهمة؟"
        : decision === "RETURN"
          ? "هل تريد إرجاع المهمة للموظف؟"
          : "هل تريد رفض هذه المهمة؟";

    if (!window.confirm(confirmation)) return;

    try {
      setBusyId(taskId);
      setError("");
      setMessage("");

      const response = await fetch("/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId,
          decision,
          notes: taskNotes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر حفظ قرار المراجعة");
      }

      setMessage(data.message || "تم حفظ قرار المراجعة");
      setSelectedTask("");
      setNotes((current) => ({
        ...current,
        [taskId]: "",
      }));

      await loadTasks();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء حفظ المراجعة"
      );
    } finally {
      setBusyId("");
    }
  }

  const filteredTasks = tasks.filter((task) => {
    if (filter === "PENDING") return task.status === "COMPLETED";
    if (filter === "APPROVED") return task.status === "APPROVED";
    if (filter === "REJECTED") return task.status === "REJECTED";
    return true;
  });

  const pendingCount = tasks.filter(
    (task) => task.status === "COMPLETED"
  ).length;

  const approvedCount = tasks.filter(
    (task) => task.status === "APPROVED"
  ).length;

  const rejectedCount = tasks.filter(
    (task) => task.status === "REJECTED"
  ).length;

  function getStatusLabel(status: string) {
    if (status === "COMPLETED") return "بانتظار المراجعة";
    if (status === "APPROVED") return "معتمدة";
    if (status === "REJECTED") return "مرفوضة";
    return status;
  }

  return (
    <div className="review-management" dir="rtl">
      <style jsx>{`
        .review-management {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .stat {
          background: white;
          border: 1px solid #e5eaf0;
          border-radius: 14px;
          padding: 18px;
        }

        .stat span {
          display: block;
          color: #64748b;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .stat strong {
          color: #123b5d;
          font-size: 26px;
        }

        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter {
          border: 1px solid #dbe3ec;
          background: white;
          color: #475569;
          border-radius: 9px;
          padding: 9px 14px;
          cursor: pointer;
        }

        .filter.active {
          background: #123b5d;
          color: white;
          border-color: #123b5d;
        }

        .refresh {
          border: 1px solid #dbe3ec;
          background: white;
          color: #123b5d;
          border-radius: 9px;
          padding: 9px 14px;
          cursor: pointer;
        }

        .task-list {
          display: grid;
          gap: 14px;
        }

        .task-card {
          background: white;
          border: 1px solid #e5eaf0;
          border-radius: 14px;
          padding: 20px;
        }

        .task-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          flex-wrap: wrap;
        }

        .task-header h3 {
          margin: 0 0 8px;
          color: #123b5d;
          font-size: 17px;
        }

        .muted {
          color: #64748b;
          font-size: 13px;
          line-height: 1.8;
        }

        .status {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 20px;
          font-size: 12px;
          background: #fff7e6;
          color: #9a6700;
        }

        .status.approved {
          background: #e8f7ee;
          color: #167342;
        }

        .status.rejected {
          background: #feecec;
          color: #b42318;
        }

        .details {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid #edf0f4;
        }

        .detail {
          color: #475569;
          font-size: 13px;
        }

        .detail strong {
          color: #123b5d;
          margin-left: 5px;
        }

        .review-box {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #edf0f4;
        }

        .review-box label {
          display: block;
          margin-bottom: 8px;
          color: #334155;
          font-size: 13px;
          font-weight: 600;
        }

        .review-box textarea {
          width: 100%;
          min-height: 85px;
          resize: vertical;
          border: 1px solid #dbe3ec;
          border-radius: 9px;
          padding: 11px;
          font: inherit;
          outline: none;
        }

        .review-box textarea:focus {
          border-color: #1e5b85;
        }

        .actions {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .actions button {
          border: 0;
          border-radius: 9px;
          padding: 10px 16px;
          color: white;
          cursor: pointer;
          font: inherit;
        }

        .approve {
          background: #16804a;
        }

        .return {
          background: #b7791f;
        }

        .reject {
          background: #b42318;
        }

        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .notice {
          padding: 12px 14px;
          border-radius: 9px;
          background: #e8f7ee;
          color: #167342;
          font-size: 14px;
        }

        .error {
          padding: 12px 14px;
          border-radius: 9px;
          background: #feecec;
          color: #b42318;
          font-size: 14px;
        }

        .empty {
          background: white;
          border: 1px dashed #cbd5e1;
          border-radius: 14px;
          padding: 35px 18px;
          text-align: center;
          color: #64748b;
        }

        @media (max-width: 650px) {
          .stats {
            grid-template-columns: 1fr;
          }

          .details {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="stats">
        <div className="stat">
          <span>بانتظار المراجعة</span>
          <strong>{pendingCount}</strong>
        </div>

        <div className="stat">
          <span>المهام المعتمدة</span>
          <strong>{approvedCount}</strong>
        </div>

        <div className="stat">
          <span>المهام المرفوضة</span>
          <strong>{rejectedCount}</strong>
        </div>
      </div>

      {message && <div className="notice">{message}</div>}
      {error && <div className="error">{error}</div>}

      <div className="toolbar">
        <div className="filters">
          {[
            { id: "ALL", label: "الكل" },
            { id: "PENDING", label: "بانتظار المراجعة" },
            { id: "APPROVED", label: "معتمدة" },
            { id: "REJECTED", label: "مرفوضة" },
          ].map((item) => (
            <button
              key={item.id}
              className={`filter ${filter === item.id ? "active" : ""}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button className="refresh" onClick={loadTasks}>
          تحديث القائمة
        </button>
      </div>

      {loading ? (
        <div className="empty">جاري تحميل مهام المراجعة...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="empty">لا توجد مهام في هذا التصنيف.</div>
      ) : (
        <div className="task-list">
          {filteredTasks.map((task) => {
            const canReview = task.status === "COMPLETED";
            const isOpen = selectedTask === task.id;
            const lastActivity = task.activities?.[0];

            return (
              <article className="task-card" key={task.id}>
                <div className="task-header">
                  <div>
                    <h3>{task.title}</h3>
                    <div className="muted">
                      الطلب رقم: {task.request.requestNumber}
                    </div>
                  </div>

                  <span
                    className={`status ${
                      task.status === "APPROVED"
                        ? "approved"
                        : task.status === "REJECTED"
                          ? "rejected"
                          : ""
                    }`}
                  >
                    {getStatusLabel(task.status)}
                  </span>
                </div>

                <div className="details">
                  <div className="detail">
                    <strong>العميل:</strong>
                    {task.request.customer?.name || "غير محدد"}
                  </div>

                  <div className="detail">
                    <strong>الخدمة:</strong>
                    {task.request.serviceName}
                  </div>

                  <div className="detail">
                    <strong>القسم:</strong>
                    {task.department.name}
                  </div>

                  <div className="detail">
                    <strong>الموظف:</strong>
                    {task.assignedTo?.name || "غير محدد"}
                  </div>
                </div>

                {task.instructions && (
                  <p className="muted">
                    <strong>تعليمات التنفيذ:</strong> {task.instructions}
                  </p>
                )}

                {lastActivity && (
                  <p className="muted">
                    آخر قرار: {lastActivity.user.name} —{" "}
                    {new Date(lastActivity.createdAt).toLocaleString("ar-EG")}
                  </p>
                )}

                {canReview && (
                  <div className="review-box">
                    <button
                      className="refresh"
                      onClick={() =>
                        setSelectedTask(isOpen ? "" : task.id)
                      }
                    >
                      {isOpen ? "إخفاء المراجعة" : "مراجعة المهمة"}
                    </button>

                    {isOpen && (
                      <>
                        <label htmlFor={`notes-${task.id}`}>
                          ملاحظات المراجعة أو سبب الإرجاع / الرفض
                        </label>

                        <textarea
                          id={`notes-${task.id}`}
                          value={notes[task.id] || ""}
                          onChange={(event) =>
                            setNotes((current) => ({
                              ...current,
                              [task.id]: event.target.value,
                            }))
                          }
                          placeholder="اكتب ملاحظاتك هنا..."
                        />

                        <div className="actions">
                          <button
                            className="approve"
                            disabled={busyId === task.id}
                            onClick={() =>
                              submitDecision(task.id, "APPROVE")
                            }
                          >
                            اعتماد المهمة
                          </button>

                          <button
                            className="return"
                            disabled={busyId === task.id}
                            onClick={() =>
                              submitDecision(task.id, "RETURN")
                            }
                          >
                            إرجاع للتعديل
                          </button>

                          <button
                            className="reject"
                            disabled={busyId === task.id}
                            onClick={() =>
                              submitDecision(task.id, "REJECT")
                            }
                          >
                            رفض المهمة
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
