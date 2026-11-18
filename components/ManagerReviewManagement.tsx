
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ReviewDocument = {
  id: string;
  name?: string;
  title?: string;
  status?: string;
  isCompleted?: boolean;
  value?: string | null;
};

type ManagerReview = {
  action: string;
  feedback?: string | null;
  createdAt?: string;
  reviewedAt?: string | null;
  reviewer?: { name: string };
};

type ReviewRequest = {
  id: string;
  requestNumber: string;
  serviceName: string;
  serviceVariantName?: string | null;
  status: string;
  priority?: string;
  description?: string | null;
  createdAt?: string;
  submittedAt?: string | null;
  customer?: {
    name: string;
    phone?: string | null;
    email?: string | null;
    taxNumber?: string | null;
  } | null;
  createdBy?: { name: string } | null;
  currentDepartment?: { name: string } | null;
  documentRequirements?: ReviewDocument[];
  managerReview?: ManagerReview | null;
};

const statusLabels: Record<string, string> = {
  PENDING_REVIEW: "بانتظار مراجعة المدير",
  READY_FOR_ASSIGNMENT: "تم الاعتماد",
  RETURNED_TO_SECRETARY: "مُعاد للسكرتارية",
  IN_PROGRESS: "قيد التنفيذ",
  COMPLETED: "مكتمل",
  REJECTED: "مرفوض",
  CLOSED: "مغلق",
};

function formatDate(value?: string | null) {
  if (!value) return "غير محدد";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير محدد";

  return date.toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ManagerReviewManagement() {
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("PENDING");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/manager-reviews", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر تحميل طلبات المراجعة");
      }

      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء تحميل الطلبات"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "PENDING_REVIEW"),
    [requests]
  );

  const approvedRequests = useMemo(
    () =>
      requests.filter(
        (request) => request.status === "READY_FOR_ASSIGNMENT"
      ),
    [requests]
  );

  const returnedRequests = useMemo(
    () =>
      requests.filter(
        (request) => request.status === "RETURNED_TO_SECRETARY"
      ),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesFilter =
        filter === "ALL" ||
        (filter === "PENDING" && request.status === "PENDING_REVIEW") ||
        (filter === "APPROVED" &&
          request.status === "READY_FOR_ASSIGNMENT") ||
        (filter === "RETURNED" &&
          request.status === "RETURNED_TO_SECRETARY");

      const matchesSearch =
        !query ||
        request.requestNumber.toLowerCase().includes(query) ||
        request.serviceName.toLowerCase().includes(query) ||
        (request.customer?.name || "").toLowerCase().includes(query) ||
        (request.createdBy?.name || "").toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [requests, filter, search]);

  async function submitDecision(
    requestId: string,
    decision: "APPROVE" | "RETURN"
  ) {
    const notes = (feedback[requestId] || "").trim();

    if (decision === "RETURN" && !notes) {
      setError("اكتب سبب إرجاع الطلب للسكرتارية أولاً.");
      return;
    }

    const confirmation =
      decision === "APPROVE"
        ? "هل تريد اعتماد الطلب وإتاحته لتوزيع المهام؟"
        : "هل تريد إرجاع الطلب للسكرتارية مع الملاحظات؟";

    if (!window.confirm(confirmation)) return;

    setBusyId(requestId);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/manager-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          decision,
          feedback: notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر حفظ قرار المراجعة");
      }

      setMessage(
        data.message ||
          (decision === "APPROVE"
            ? "تم اعتماد الطلب بنجاح."
            : "تم إرجاع الطلب للسكرتارية.")
      );

      setFeedback((current) => ({ ...current, [requestId]: "" }));
      await loadRequests();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء حفظ القرار"
      );
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="manager-review" dir="rtl">
      <style jsx>{`
        .manager-review {
          display: grid;
          gap: 20px;
          color: #183247;
        }
        .heading h1 {
          margin: 0 0 7px;
          font-size: 25px;
          font-weight: 800;
        }
        .heading p {
          margin: 0;
          color: #718096;
          font-size: 14px;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .stat,
        .panel,
        .request-card {
          background: #fff;
          border: 1px solid #e6edf3;
          border-radius: 14px;
          box-shadow: 0 5px 18px rgba(20, 50, 75, 0.035);
        }
        .stat {
          padding: 17px 19px;
        }
        .stat span {
          display: block;
          color: #718096;
          font-size: 13px;
          margin-bottom: 8px;
        }
        .stat strong {
          color: #123b5d;
          font-size: 26px;
        }
        .panel {
          padding: 18px;
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
          gap: 7px;
          flex-wrap: wrap;
        }
        .filter,
        .refresh {
          border: 1px solid #dce5ed;
          background: #fff;
          color: #34495e;
          border-radius: 9px;
          padding: 9px 13px;
          font: inherit;
          font-size: 13px;
          cursor: pointer;
        }
        .filter.active {
          color: #fff;
          background: #123b5d;
          border-color: #123b5d;
        }
        .search {
          width: min(100%, 310px);
          box-sizing: border-box;
          border: 1px solid #dce5ed;
          border-radius: 9px;
          padding: 10px 12px;
          font: inherit;
          outline: none;
        }
        .request-list {
          display: grid;
          gap: 14px;
        }
        .request-card {
          padding: 19px;
        }
        .request-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          flex-wrap: wrap;
        }
        .request-top h2 {
          margin: 0 0 7px;
          color: #123b5d;
          font-size: 17px;
        }
        .number {
          color: #1e5b85;
          font-size: 13px;
          font-weight: 800;
        }
        .status {
          display: inline-block;
          border-radius: 20px;
          padding: 6px 11px;
          background: #fff5df;
          color: #946200;
          font-size: 12px;
          font-weight: 700;
        }
        .status.approved {
          background: #e9f7ef;
          color: #176344;
        }
        .status.returned {
          background: #fff0e8;
          color: #a64b1d;
        }
        .details {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 17px;
          padding: 15px 0;
          border-top: 1px solid #edf1f5;
          border-bottom: 1px solid #edf1f5;
        }
        .detail {
          min-width: 0;
          color: #526477;
          font-size: 13px;
          line-height: 1.8;
          overflow-wrap: anywhere;
        }
        .detail strong {
          display: block;
          color: #183247;
          margin-bottom: 2px;
        }
        .description {
          margin: 14px 0 0;
          color: #526477;
          font-size: 13px;
          line-height: 1.9;
          white-space: pre-wrap;
        }
        .documents {
          margin-top: 15px;
        }
        .documents h3,
        .review-area h3 {
          margin: 0 0 10px;
          color: #183247;
          font-size: 14px;
        }
        .document-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .document {
          border: 1px solid #e3eaf0;
          background: #f7f9fb;
          color: #526477;
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 12px;
        }
        .review-area {
          margin-top: 17px;
          padding-top: 16px;
          border-top: 1px solid #edf1f5;
        }
        .review-area textarea {
          width: 100%;
          min-height: 82px;
          box-sizing: border-box;
          resize: vertical;
          border: 1px solid #dce5ed;
          border-radius: 9px;
          padding: 11px;
          font: inherit;
          font-size: 13px;
          outline: none;
        }
        .review-area textarea:focus,
        .search:focus {
          border-color: #2876a8;
          box-shadow: 0 0 0 3px rgba(40, 118, 168, 0.09);
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
          padding: 10px 17px;
          color: white;
          font: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .approve {
          background: #16804a;
        }
        .return {
          background: #b7791f;
        }
        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .notice,
        .error,
        .empty {
          border-radius: 10px;
          padding: 13px 15px;
          font-size: 13px;
        }
        .notice {
          color: #176344;
          background: #eaf8f0;
          border: 1px solid #c9eed9;
        }
        .error {
          color: #a12c35;
          background: #fff0f0;
          border: 1px solid #ffd8d8;
        }
        .empty {
          padding: 35px 18px;
          text-align: center;
          color: #718096;
          background: #fff;
          border: 1px dashed #cbd5e1;
        }
        .history {
          margin-top: 12px;
          padding: 11px 13px;
          border-radius: 9px;
          background: #f7f9fb;
          color: #64748b;
          font-size: 12px;
          line-height: 1.8;
        }
        @media (max-width: 750px) {
          .stats {
            grid-template-columns: 1fr;
          }
          .details {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .toolbar {
            align-items: stretch;
          }
          .search {
            width: 100%;
          }
        }
        @media (max-width: 480px) {
          .details {
            grid-template-columns: 1fr;
          }
          .panel,
          .request-card {
            padding: 14px;
          }
        }
      `}</style>

      <header className="heading">
        <h1>مراجعة واعتماد الطلبات</h1>
        <p>
          مراجعة بيانات الطلب والمستندات قبل تحويله إلى مرحلة توزيع المهام.
        </p>
      </header>

      <section className="stats">
        <div className="stat">
          <span>بانتظار المراجعة</span>
          <strong>{pendingRequests.length}</strong>
        </div>
        <div className="stat">
          <span>طلبات معتمدة</span>
          <strong>{approvedRequests.length}</strong>
        </div>
        <div className="stat">
          <span>طلبات مُعادة للسكرتارية</span>
          <strong>{returnedRequests.length}</strong>
        </div>
      </section>

      {message && <div className="notice">{message}</div>}
      {error && <div className="error">{error}</div>}

      <section className="panel">
        <div className="toolbar">
          <div className="filters">
            {[
              { id: "PENDING", label: "بانتظار المراجعة" },
              { id: "ALL", label: "كل الطلبات" },
              { id: "APPROVED", label: "المعتمدة" },
              { id: "RETURNED", label: "المُعادة" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={`filter ${filter === item.id ? "active" : ""}`}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <input
            className="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث برقم الطلب أو العميل أو الخدمة..."
          />

          <button
            type="button"
            className="refresh"
            onClick={loadRequests}
            disabled={loading}
          >
            تحديث القائمة
          </button>
        </div>
      </section>

      {loading ? (
        <div className="empty">جارٍ تحميل طلبات المراجعة...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="empty">
          لا توجد طلبات في هذا التصنيف حاليًا.
        </div>
      ) : (
        <section className="request-list">
          {filteredRequests.map((request) => {
            const canReview = request.status === "PENDING_REVIEW";
            const isBusy = busyId === request.id;
            const statusClass =
              request.status === "READY_FOR_ASSIGNMENT"
                ? "approved"
                : request.status === "RETURNED_TO_SECRETARY"
                  ? "returned"
                  : "";

            return (
              <article className="request-card" key={request.id}>
                <div className="request-top">
                  <div>
                    <h2>{request.serviceName}</h2>
                    <div className="number">
                      رقم الطلب: {request.requestNumber}
                    </div>
                  </div>
                  <span className={`status ${statusClass}`}>
                    {statusLabels[request.status] || request.status}
                  </span>
                </div>

                <div className="details">
                  <div className="detail">
                    <strong>العميل / الشركة</strong>
                    {request.customer?.name || "غير محدد"}
                  </div>
                  <div className="detail">
                    <strong>رقم الهاتف</strong>
                    {request.customer?.phone || "غير مسجل"}
                  </div>
                  <div className="detail">
                    <strong>البريد الإلكتروني</strong>
                    {request.customer?.email || "غير مسجل"}
                  </div>
                  <div className="detail">
                    <strong>الخدمة</strong>
                    {request.serviceName}
                    {request.serviceVariantName
                      ? ` — ${request.serviceVariantName}`
                      : ""}
                  </div>
                  <div className="detail">
                    <strong>مقدم الطلب</strong>
                    {request.createdBy?.name || "غير محدد"}
                  </div>
                  <div className="detail">
                    <strong>القسم الحالي</strong>
                    {request.currentDepartment?.name || "غير محدد"}
                  </div>
                  <div className="detail">
                    <strong>تاريخ التسجيل</strong>
                    {formatDate(request.createdAt)}
                  </div>
                  <div className="detail">
                    <strong>الأولوية</strong>
                    {request.priority || "عادية"}
                  </div>
                  <div className="detail">
                    <strong>الرقم الضريبي</strong>
                    {request.customer?.taxNumber || "غير مسجل"}
                  </div>
                </div>

                {request.description && (
                  <p className="description">
                    <strong>وصف الطلب: </strong>
                    {request.description}
                  </p>
                )}

                <div className="documents">
                  <h3>المستندات والمتطلبات المسجلة</h3>
                  {request.documentRequirements?.length ? (
                    <div className="document-list">
                      {request.documentRequirements.map((document) => (
                        <span className="document" key={document.id}>
                          {document.name || document.title || "مستند"}
                          {document.isCompleted === true
                            ? " — مكتمل"
                            : document.isCompleted === false
                              ? " — غير مكتمل"
                              : ""}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="detail">
                      لا توجد متطلبات مستندات مسجلة لهذا الطلب.
                    </div>
                  )}
                </div>

                {request.managerReview?.feedback && (
                  <div className="history">
                    آخر ملاحظة مراجعة: {request.managerReview.feedback}
                    {request.managerReview.reviewer?.name
                      ? ` — ${request.managerReview.reviewer.name}`
                      : ""}
                  </div>
                )}

                {canReview && (
                  <div className="review-area">
                    <h3>قرار مراجعة الطلب</h3>
                    <textarea
                      value={feedback[request.id] || ""}
                      onChange={(event) =>
                        setFeedback((current) => ({
                          ...current,
                          [request.id]: event.target.value,
                        }))
                      }
                      placeholder="اكتب الملاحظات أو سبب الإرجاع للسكرتارية..."
                      disabled={isBusy}
                    />

                    <div className="actions">
                      <button
                        type="button"
                        className="approve"
                        disabled={isBusy}
                        onClick={() =>
                          submitDecision(request.id, "APPROVE")
                        }
                      >
                        {isBusy ? "جارٍ الحفظ..." : "اعتماد الطلب"}
                      </button>
                      <button
                        type="button"
                        className="return"
                        disabled={isBusy}
                        onClick={() =>
                          submitDecision(request.id, "RETURN")
                        }
                      >
                        إرجاع للسكرتارية
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
