
"use client";

import { useCallback, useEffect, useState } from "react";

type DeliveryActivity = {
  details: string | null;
  createdAt: string;
  user: {
    name: string;
  };
};

type DeliveryTask = {
  id: string;
  title: string;
  status: string;
  request: {
    id: string;
    requestNumber: string;
    serviceName: string;
    status: string;
    customer: {
      name: string;
    };
  };
  department: {
    name: string;
  };
  assignedTo: {
    name: string;
  } | null;
  activities: DeliveryActivity[];
};

type DeliveryForm = {
  deliveryMethod: string;
  deliveryOutputs: string;
  deliveryDate: string;
  deliveryNotes: string;
};

const emptyForm: DeliveryForm = {
  deliveryMethod: "",
  deliveryOutputs: "",
  deliveryDate: new Date().toISOString().slice(0, 10),
  deliveryNotes: "",
};

export default function DeliveryManagement() {
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedTask, setSelectedTask] = useState("");
  const [form, setForm] = useState<DeliveryForm>(emptyForm);
  const [filter, setFilter] = useState("ALL");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/delivery", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر تحميل مهام التسليم");
      }

      setTasks(data.tasks || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل البيانات"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  function updateForm(name: keyof DeliveryForm, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function openDelivery(taskId: string) {
    setSelectedTask(taskId);
    setForm({
      ...emptyForm,
      deliveryDate: new Date().toISOString().slice(0, 10),
    });
    setError("");
    setMessage("");
  }

  async function submitDelivery(taskId: string) {
    if (
      !form.deliveryMethod ||
      !form.deliveryOutputs.trim() ||
      !form.deliveryDate
    ) {
      setError("أكمل طريقة التسليم والمخرجات وتاريخ التسليم");
      return;
    }

    if (!window.confirm("هل تريد تأكيد تسليم هذه المهمة؟")) {
      return;
    }

    try {
      setBusy(true);
      setError("");
      setMessage("");

      const response = await fetch("/api/delivery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId,
          ...form,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر تسجيل التسليم");
      }

      setMessage(data.message || "تم تسجيل التسليم بنجاح");
      setSelectedTask("");
      setForm(emptyForm);

      await loadTasks();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تسجيل التسليم"
      );
    } finally {
      setBusy(false);
    }
  }

  const filteredTasks = tasks.filter((task) => {
    if (filter === "PENDING") return task.status === "APPROVED";
    if (filter === "DELIVERED") return task.status === "DELIVERED";
    return true;
  });

  const pendingCount = tasks.filter(
    (task) => task.status === "APPROVED"
  ).length;

  const deliveredCount = tasks.filter(
    (task) => task.status === "DELIVERED"
  ).length;

  return (
    <div className="delivery-management" dir="rtl">
      <style jsx>{`
        .delivery-management {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
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
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filters button,
        .refresh,
        .open-button {
          border: 1px solid #dbe3ec;
          background: white;
          color: #123b5d;
          border-radius: 9px;
          padding: 9px 14px;
          cursor: pointer;
          font: inherit;
        }

        .filters button.active {
          background: #123b5d;
          border-color: #123b5d;
          color: white;
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
          color: #123b5d;
          margin: 0 0 8px;
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
          background: #fff7e6;
          color: #9a6700;
          font-size: 12px;
        }

        .status.delivered {
          background: #e8f7ee;
          color: #167342;
        }

        .details {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin: 16px 0;
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

        .form-box {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #edf0f4;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .field label {
          color: #334155;
          font-size: 13px;
          font-weight: 600;
        }

        .field input,
        .field select,
        .field textarea {
          width: 100%;
          border: 1px solid #dbe3ec;
          border-radius: 9px;
          padding: 11px;
          font: inherit;
          outline: none;
          background: white;
        }

        .field textarea {
          min-height: 90px;
          resize: vertical;
        }

        .field input:focus,
        .field select:focus,
        .field textarea:focus {
          border-color: #1e5b85;
        }

        .actions {
          display: flex;
          gap: 9px;
          margin-top: 14px;
          flex-wrap: wrap;
        }

        .submit {
          background: #16804a;
          color: white;
          border: 0;
          border-radius: 9px;
          padding: 11px 18px;
          cursor: pointer;
          font: inherit;
        }

        .cancel {
          background: white;
          color: #475569;
          border: 1px solid #dbe3ec;
          border-radius: 9px;
          padding: 11px 18px;
          cursor: pointer;
          font: inherit;
        }

        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .notice,
        .error,
        .empty {
          padding: 14px;
          border-radius: 10px;
          font-size: 14px;
        }

        .notice {
          background: #e8f7ee;
          color: #167342;
        }

        .error {
          background: #feecec;
          color: #b42318;
        }

        .empty {
          background: white;
          border: 1px dashed #cbd5e1;
          color: #64748b;
          text-align: center;
        }

        @media (max-width: 650px) {
          .stats,
          .details,
          .form-grid {
            grid-template-columns: 1fr;
          }

          .field.full {
            grid-column: auto;
          }
        }
      `}</style>

      <div className="stats">
        <div className="stat">
          <span>مهام معتمدة بانتظار التسليم</span>
          <strong>{pendingCount}</strong>
        </div>

        <div className="stat">
          <span>مهام تم تسليمها</span>
          <strong>{deliveredCount}</strong>
        </div>
      </div>

      {message && <div className="notice">{message}</div>}
      {error && <div className="error">{error}</div>}

      <div className="toolbar">
        <div className="filters">
          <button
            className={filter === "ALL" ? "active" : ""}
            onClick={() => setFilter("ALL")}
          >
            الكل
          </button>

          <button
            className={filter === "PENDING" ? "active" : ""}
            onClick={() => setFilter("PENDING")}
          >
            بانتظار التسليم
          </button>

          <button
            className={filter === "DELIVERED" ? "active" : ""}
            onClick={() => setFilter("DELIVERED")}
          >
            تم التسليم
          </button>
        </div>

        <button className="refresh" onClick={loadTasks}>
          تحديث القائمة
        </button>
      </div>

      {loading ? (
        <div className="empty">جاري تحميل مهام التسليم...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="empty">
          لا توجد مهام في هذا التصنيف حاليًا.
        </div>
      ) : (
        <div className="task-list">
          {filteredTasks.map((task) => {
            const isDelivered = task.status === "DELIVERED";
            const isOpen = selectedTask === task.id;

            return (
              <article className="task-card" key={task.id}>
                <div className="task-header">
                  <div>
                    <h3>{task.title}</h3>
                    <div className="muted">
                      رقم الطلب: {task.request.requestNumber}
                    </div>
                  </div>

                  <span
                    className={`status ${
                      isDelivered ? "delivered" : ""
                    }`}
                  >
                    {isDelivered ? "تم التسليم" : "بانتظار التسليم"}
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

                {isDelivered ? (
                  <div className="muted">
                    {task.activities[0] && (
                      <>
                        تم التسليم بواسطة: {task.activities[0].user.name}
                        <br />
                        تاريخ التسجيل:{" "}
                        {new Date(
                          task.activities[0].createdAt
                        ).toLocaleString("ar-EG")}
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <button
                      className="open-button"
                      onClick={() =>
                        isOpen
                          ? setSelectedTask("")
                          : openDelivery(task.id)
                      }
                    >
                      {isOpen ? "إغلاق النموذج" : "تسجيل التسليم"}
                    </button>

                    {isOpen && (
                      <div className="form-box">
                        <div className="form-grid">
                          <div className="field">
                            <label htmlFor={`method-${task.id}`}>
                              طريقة التسليم *
                            </label>

                            <select
                              id={`method-${task.id}`}
                              value={form.deliveryMethod}
                              onChange={(event) =>
                                updateForm(
                                  "deliveryMethod",
                                  event.target.value
                                )
                              }
                            >
                              <option value="">اختر طريقة التسليم</option>
                              <option value="باليد">باليد</option>
                              <option value="البريد الإلكتروني">
                                البريد الإلكتروني
                              </option>
                              <option value="مندوب">مندوب</option>
                              <option value="وسيلة أخرى">وسيلة أخرى</option>
                            </select>
                          </div>

                          <div className="field">
                            <label htmlFor={`date-${task.id}`}>
                              تاريخ التسليم *
                            </label>

                            <input
                              id={`date-${task.id}`}
                              type="date"
                              value={form.deliveryDate}
                              onChange={(event) =>
                                updateForm(
                                  "deliveryDate",
                                  event.target.value
                                )
                              }
                            />
                          </div>

                          <div className="field full">
                            <label htmlFor={`outputs-${task.id}`}>
                              المخرجات النهائية *
                            </label>

                            <textarea
                              id={`outputs-${task.id}`}
                              value={form.deliveryOutputs}
                              onChange={(event) =>
                                updateForm(
                                  "deliveryOutputs",
                                  event.target.value
                                )
                              }
                              placeholder="اكتب المخرجات التي تم تسليمها..."
                            />
                          </div>

                          <div className="field full">
                            <label htmlFor={`notes-${task.id}`}>
                              ملاحظات التسليم
                            </label>

                            <textarea
                              id={`notes-${task.id}`}
                              value={form.deliveryNotes}
                              onChange={(event) =>
                                updateForm(
                                  "deliveryNotes",
                                  event.target.value
                                )
                              }
                              placeholder="ملاحظات إضافية..."
                            />
                          </div>
                        </div>

                        <div className="actions">
                          <button
                            className="submit"
                            disabled={busy}
                            onClick={() => submitDelivery(task.id)}
                          >
                            {busy ? "جاري الحفظ..." : "تأكيد التسليم"}
                          </button>

                          <button
                            className="cancel"
                            disabled={busy}
                            onClick={() => setSelectedTask("")}
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
