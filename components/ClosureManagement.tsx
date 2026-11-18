
"use client";

import { useCallback, useEffect, useState } from "react";

type ClosureActivity = {
  details: string | null;
  createdAt: string;
  user: {
    name: string;
  };
};

type ClosureRequest = {
  id: string;
  requestNumber: string;
  serviceName: string;
  status: string;
  customer: {
    name: string;
  };
  currentDepartment: {
    name: string;
  } | null;
  tasks: {
    id: string;
    title: string;
    status: string;
  }[];
  activities: ClosureActivity[];
};

type ClosureForm = {
  clientReceived: string;
  closureDate: string;
  clientRating: string;
  closureNotes: string;
};

const emptyForm: ClosureForm = {
  clientReceived: "",
  closureDate: new Date().toISOString().slice(0, 10),
  clientRating: "لم يتم التقييم",
  closureNotes: "",
};

export default function ClosureManagement() {
  const [requests, setRequests] = useState<ClosureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<ClosureForm>(emptyForm);
  const [filter, setFilter] = useState("ALL");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/closure", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر تحميل طلبات الإغلاق");
      }

      setRequests(data.requests || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل الطلبات"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  function updateForm(name: keyof ClosureForm, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function openForm(requestId: string) {
    setSelectedId(requestId);
    setForm({
      ...emptyForm,
      closureDate: new Date().toISOString().slice(0, 10),
    });
    setError("");
    setMessage("");
  }

  async function closeRequest(requestId: string) {
    if (form.clientReceived !== "تم الاستلام") {
      setError("يجب تأكيد استلام العميل قبل إغلاق الطلب");
      return;
    }

    if (!form.closureDate) {
      setError("أدخل تاريخ الإغلاق");
      return;
    }

    if (!window.confirm("هل أنت متأكد من إغلاق هذا الطلب؟")) {
      return;
    }

    try {
      setBusy(true);
      setError("");
      setMessage("");

      const response = await fetch("/api/closure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          ...form,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر إغلاق الطلب");
      }

      setMessage(data.message || "تم إغلاق الطلب بنجاح");
      setSelectedId("");
      setForm(emptyForm);

      await loadRequests();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء إغلاق الطلب"
      );
    } finally {
      setBusy(false);
    }
  }

  const filteredRequests = requests.filter((item) => {
    if (filter === "PENDING") return item.status === "DELIVERED";
    if (filter === "CLOSED") return item.status === "CLOSED";
    return true;
  });

  const pendingCount = requests.filter(
    (item) => item.status === "DELIVERED"
  ).length;

  const closedCount = requests.filter(
    (item) => item.status === "CLOSED"
  ).length;

  return (
    <div className="closure-management" dir="rtl">
      <style jsx>{`
        .closure-management {
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
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
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

        .request-list {
          display: grid;
          gap: 14px;
        }

        .request-card {
          background: white;
          border: 1px solid #e5eaf0;
          border-radius: 14px;
          padding: 20px;
        }

        .request-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          flex-wrap: wrap;
        }

        .request-header h3 {
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

        .status.closed {
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

        .task-list {
          margin: 12px 0;
          padding: 12px;
          background: #f8fafc;
          border-radius: 10px;
        }

        .task-list h4 {
          color: #123b5d;
          margin: 0 0 8px;
          font-size: 13px;
        }

        .task-row {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding: 6px 0;
          color: #475569;
          font-size: 13px;
        }

        .task-done {
          color: #167342;
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
          min-height: 85px;
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
          <span>طلبات بانتظار الإغلاق</span>
          <strong>{pendingCount}</strong>
        </div>

        <div className="stat">
          <span>طلبات مغلقة</span>
          <strong>{closedCount}</strong>
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
            بانتظار الإغلاق
          </button>

          <button
            className={filter === "CLOSED" ? "active" : ""}
            onClick={() => setFilter("CLOSED")}
          >
            مغلقة
          </button>
        </div>

        <button className="refresh" onClick={loadRequests}>
          تحديث القائمة
        </button>
      </div>

      {loading ? (
        <div className="empty">جاري تحميل الطلبات...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="empty">
          لا توجد طلبات في هذا التصنيف حاليًا.
        </div>
      ) : (
        <div className="request-list">
          {filteredRequests.map((item) => {
            const isClosed = item.status === "CLOSED";
            const isOpen = selectedId === item.id;

            return (
              <article className="request-card" key={item.id}>
                <div className="request-header">
                  <div>
                    <h3>طلب رقم {item.requestNumber}</h3>
                    <div className="muted">{item.serviceName}</div>
                  </div>

                  <span className={`status ${isClosed ? "closed" : ""}`}>
                    {isClosed ? "تم الإغلاق" : "بانتظار الإغلاق"}
                  </span>
                </div>

                <div className="details">
                  <div className="detail">
                    <strong>العميل:</strong>
                    {item.customer?.name || "غير محدد"}
                  </div>

                  <div className="detail">
                    <strong>القسم الحالي:</strong>
                    {item.currentDepartment?.name || "غير محدد"}
                  </div>

                  <div className="detail">
                    <strong>عدد المهام:</strong>
                    {item.tasks.length}
                  </div>

                  <div className="detail">
                    <strong>المهام المسلّمة:</strong>
                    {item.tasks.filter((task) => task.status === "DELIVERED").length}
                  </div>
                </div>

                <div className="task-list">
                  <h4>حالة مهام الطلب</h4>

                  {item.tasks.map((task) => (
                    <div className="task-row" key={task.id}>
                      <span>{task.title}</span>
                      <span className="task-done">
                        {task.status === "DELIVERED" ? "تم التسليم" : task.status}
                      </span>
                    </div>
                  ))}
                </div>

                {isClosed ? (
                  <div className="muted">
                    {item.activities[0] && (
                      <>
                        تم الإغلاق بواسطة: {item.activities[0].user.name}
                        <br />
                        تاريخ التسجيل:{" "}
                        {new Date(
                          item.activities[0].createdAt
                        ).toLocaleString("ar-EG")}
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <button
                      className="open-button"
                      onClick={() =>
                        isOpen ? setSelectedId("") : openForm(item.id)
                      }
                    >
                      {isOpen ? "إغلاق النموذج" : "إغلاق الطلب"}
                    </button>

                    {isOpen && (
                      <div className="form-box">
                        <div className="form-grid">
                          <div className="field">
                            <label htmlFor={`received-${item.id}`}>
                              تأكيد استلام العميل *
                            </label>

                            <select
                              id={`received-${item.id}`}
                              value={form.clientReceived}
                              onChange={(event) =>
                                updateForm("clientReceived", event.target.value)
                              }
                            >
                              <option value="">اختر الحالة</option>
                              <option value="تم الاستلام">تم الاستلام</option>
                              <option value="لم يتم الاستلام">لم يتم الاستلام</option>
                            </select>
                          </div>

                          <div className="field">
                            <label htmlFor={`date-${item.id}`}>
                              تاريخ الإغلاق *
                            </label>

                            <input
                              id={`date-${item.id}`}
                              type="date"
                              value={form.closureDate}
                              onChange={(event) =>
                                updateForm("closureDate", event.target.value)
                              }
                            />
                          </div>

                          <div className="field">
                            <label htmlFor={`rating-${item.id}`}>
                              تقييم العميل
                            </label>

                            <select
                              id={`rating-${item.id}`}
                              value={form.clientRating}
                              onChange={(event) =>
                                updateForm("clientRating", event.target.value)
                              }
                            >
                              <option value="ممتاز">ممتاز</option>
                              <option value="جيد جدًا">جيد جدًا</option>
                              <option value="جيد">جيد</option>
                              <option value="مقبول">مقبول</option>
                              <option value="لم يتم التقييم">لم يتم التقييم</option>
                            </select>
                          </div>

                          <div className="field full">
                            <label htmlFor={`notes-${item.id}`}>
                              ملاحظات الإغلاق
                            </label>

                            <textarea
                              id={`notes-${item.id}`}
                              value={form.closureNotes}
                              onChange={(event) =>
                                updateForm("closureNotes", event.target.value)
                              }
                              placeholder="اكتب ملاحظات الإغلاق..."
                            />
                          </div>
                        </div>

                        <div className="actions">
                          <button
                            className="submit"
                            disabled={busy}
                            onClick={() => closeRequest(item.id)}
                          >
                            {busy ? "جاري الحفظ..." : "تأكيد إغلاق الطلب"}
                          </button>

                          <button
                            className="cancel"
                            disabled={busy}
                            onClick={() => setSelectedId("")}
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
