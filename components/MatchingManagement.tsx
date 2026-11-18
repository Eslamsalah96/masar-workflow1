
"use client";

import { useCallback, useEffect, useState } from "react";

type DocumentItem = {
  id: string;
  title: string;
  details?: string | null;
  isRequired: boolean;
  kind: string;
  status: string;
  fileName?: string | null;
};

type ActivityItem = {
  action: string;
  details: string | null;
  createdAt: string;
  user?: { name: string } | null;
};

type RequestItem = {
  id: string;
  requestNumber: string;
  serviceName: string;
  status: string;
  customer: { name: string } | null;
  currentDepartment: { name: string } | null;
  documentRequirements: DocumentItem[];
  activities: ActivityItem[];
};

type MatchingResult = {
  result?: string;
  resultLabel?: string;
  notes?: string;
  durationMinutes?: number;
  exceededTwoHours?: boolean;
  startedAt?: string;
  completedAt?: string;
};

function readResult(details: string | null): MatchingResult | null {
  if (!details) return null;

  try {
    return JSON.parse(details) as MatchingResult;
  } catch {
    return null;
  }
}

export default function MatchingManagement() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [requestId, setRequestId] = useState("");
  const [result, setResult] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [now, setNow] = useState(Date.now());

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/matching", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر تحميل طلبات المطابقة");
      }

      setRequests(data.requests || []);
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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const selected = requests.find((item) => item.id === requestId);
  const latestActivity = selected?.activities?.[0];
  const isStarted = latestActivity?.action === "MATCHING_STARTED";
  const latestResult =
    latestActivity?.action === "MATCHING_COMPLETED"
      ? readResult(latestActivity.details)
      : null;

  const requiredDocuments =
    selected?.documentRequirements.filter(
      (document) => document.isRequired && document.kind === "DOCUMENT"
    ) || [];

  const missingDocuments = requiredDocuments.filter(
    (document) => document.status !== "RECEIVED"
  );

  const receivedDocuments =
    selected?.documentRequirements.filter(
      (document) => document.status === "RECEIVED"
    ).length || 0;

  const startedAt = isStarted
    ? new Date(latestActivity.createdAt).getTime()
    : null;

  const elapsedMinutes =
    startedAt === null
      ? 0
      : Math.max(0, Math.floor((now - startedAt) / 60000));

  const exceeded = elapsedMinutes > 120;

  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;

  async function sendAction(action: "START" | "COMPLETE") {
    if (!requestId) {
      setError("اختر الطلب أولاً");
      return;
    }

    if (action === "COMPLETE" && !result) {
      setError("اختر نتيجة المطابقة");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          action,
          result,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر حفظ بيانات المطابقة");
      }

      setSuccess(
        action === "START"
          ? "بدأت المطابقة وتم تسجيل وقت البداية"
          : `${data.message} — مدة المطابقة ${data.durationMinutes} دقيقة${
              data.exceededTwoHours ? " — تم تجاوز الساعتين" : ""
            }`
      );

      setResult("");
      setNotes("");
      await loadRequests();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء حفظ المطابقة"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="matching-page" dir="rtl">
      <style jsx>{`
        .matching-page {
          display: grid;
          gap: 19px;
          color: #183247;
        }
        .heading h2 {
          margin: 0 0 7px;
          font-size: 21px;
        }
        .heading p {
          margin: 0;
          color: #718096;
          font-size: 14px;
        }
        .panel {
          background: white;
          border: 1px solid #e6edf3;
          border-radius: 15px;
          padding: 21px;
          box-shadow: 0 5px 18px rgba(20, 50, 75, 0.04);
        }
        label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 700;
        }
        select,
        textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #dce5ed;
          border-radius: 9px;
          padding: 12px;
          background: white;
          font: inherit;
          font-size: 13px;
        }
        textarea {
          min-height: 90px;
          resize: vertical;
        }
        .timer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          border-radius: 12px;
          padding: 17px;
          background: #edf5fb;
        }
        .timer.warning {
          background: #fff0e9;
        }
        .timer span {
          display: block;
          color: #63798b;
          font-size: 12px;
          margin-bottom: 5px;
        }
        .timer strong {
          font-size: 25px;
          color: #1e5b85;
          font-variant-numeric: tabular-nums;
        }
        .timer.warning strong {
          color: #b45309;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .stat {
          background: #f5f8fb;
          border-radius: 11px;
          padding: 15px;
        }
        .stat span {
          display: block;
          color: #718096;
          font-size: 12px;
          margin-bottom: 6px;
        }
        .stat strong {
          color: #1e5b85;
          font-size: 21px;
        }
        .document {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          padding: 13px 0;
          border-bottom: 1px solid #edf1f5;
        }
        .document:last-child {
          border-bottom: 0;
        }
        .document strong {
          font-size: 13px;
        }
        .document small {
          display: block;
          color: #718096;
          margin-top: 5px;
        }
        .pill {
          border-radius: 20px;
          padding: 5px 10px;
          white-space: nowrap;
          font-size: 11px;
          font-weight: 700;
          background: #fff2e6;
          color: #a65b16;
        }
        .pill.done {
          background: #eaf8f0;
          color: #176344;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .full {
          grid-column: 1 / -1;
        }
        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 17px;
        }
        button {
          border: 0;
          border-radius: 9px;
          padding: 11px 19px;
          font: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          background: #1e5b85;
          color: white;
        }
        button.secondary {
          background: #eaf0f5;
          color: #34495e;
        }
        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .alert {
          padding: 12px 14px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 600;
        }
        .error {
          background: #fff0f0;
          color: #a12c35;
        }
        .success {
          background: #eaf8f0;
          color: #176344;
        }
        .result-box {
          display: grid;
          gap: 8px;
          color: #526779;
          font-size: 13px;
          line-height: 1.8;
        }
        .empty {
          text-align: center;
          padding: 25px;
          color: #8291a0;
          font-size: 13px;
        }
        @media (max-width: 650px) {
          .stats,
          .form-grid {
            grid-template-columns: 1fr;
          }
          .full {
            grid-column: auto;
          }
          .panel {
            padding: 15px;
          }
        }
      `}</style>

      <div className="heading">
        <h2>مطابقة المستندات</h2>
        <p>
          مراجعة المستندات المسجلة وتوثيق نتيجة المطابقة خلال ساعتين كحد أقصى
        </p>
      </div>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <section className="panel">
        <label htmlFor="matching-request">اختر الطلب</label>
        <select
          id="matching-request"
          value={requestId}
          onChange={(event) => {
            setRequestId(event.target.value);
            setResult("");
            setNotes("");
            setError("");
            setSuccess("");
          }}
        >
          <option value="">اختر الطلب المطلوب مطابقته</option>
          {requests.map((item) => (
            <option key={item.id} value={item.id}>
              {item.requestNumber} — {item.customer?.name || "بدون عميل"}
            </option>
          ))}
        </select>
      </section>

      {selected && (
        <>
          <section className="stats">
            <div className="stat">
              <span>إجمالي المستندات</span>
              <strong>{selected.documentRequirements.length}</strong>
            </div>
            <div className="stat">
              <span>المستندات المستلمة</span>
              <strong>{receivedDocuments}</strong>
            </div>
            <div className="stat">
              <span>المستندات الإلزامية الناقصة</span>
              <strong>{missingDocuments.length}</strong>
            </div>
          </section>

          <section className="panel">
            <h3 style={{ marginTop: 0 }}>مراجعة المستندات</h3>
            {selected.documentRequirements.length === 0 ? (
              <div className="empty">لا توجد مستندات مسجلة لهذا الطلب</div>
            ) : (
              selected.documentRequirements.map((document) => (
                <div className="document" key={document.id}>
                  <div>
                    <strong>
                      {document.title}
                      {document.isRequired ? " *" : ""}
                    </strong>
                    {document.details && <small>{document.details}</small>}
                    {document.fileName && (
                      <small>الملف: {document.fileName}</small>
                    )}
                  </div>
                  <span
                    className={`pill ${
                      document.status === "RECEIVED" ? "done" : ""
                    }`}
                  >
                    {document.status === "RECEIVED"
                      ? "مستلم"
                      : "غير مستلم"}
                  </span>
                </div>
              ))
            )}
          </section>

          <section className="panel">
            <h3 style={{ marginTop: 0 }}>وقت المطابقة</h3>

            <div className={`timer ${exceeded ? "warning" : ""}`}>
              <div>
                <span>
                  {isStarted ? "الوقت المنقضي منذ بدء المطابقة" : "الحد الأقصى"}
                </span>
                <strong>
                  {isStarted
                    ? `${String(hours).padStart(2, "0")}:${String(
                        minutes
                      ).padStart(2, "0")}`
                    : "02:00"}
                </strong>
              </div>
              <div>
                <span>الحالة</span>
                <strong style={{ fontSize: 14 }}>
                  {isStarted
                    ? exceeded
                      ? "تم تجاوز الساعتين"
                      : "المطابقة جارية"
                    : latestResult
                      ? "تمت المطابقة"
                      : "لم تبدأ"}
                </strong>
              </div>
            </div>

            {latestResult && (
              <div className="result-box" style={{ marginTop: 14 }}>
                <strong>آخر نتيجة مسجلة: {latestResult.resultLabel}</strong>
                <span>
                  المدة: {latestResult.durationMinutes ?? 0} دقيقة
                </span>
                <span>
                  تجاوز الحد:{" "}
                  {latestResult.exceededTwoHours ? "نعم" : "لا"}
                </span>
                {latestResult.notes && (
                  <span>الملاحظات: {latestResult.notes}</span>
                )}
              </div>
            )}

            {isStarted ? (
              <div style={{ marginTop: 18 }}>
                <div className="form-grid">
                  <div className="full">
                    <label htmlFor="matching-result">نتيجة المطابقة *</label>
                    <select
                      id="matching-result"
                      value={result}
                      onChange={(event) => setResult(event.target.value)}
                    >
                      <option value="">اختر النتيجة</option>
                      <option value="MATCHED">مطابقة</option>
                      <option value="NOT_MATCHED">غير مطابقة</option>
                      <option value="NEEDS_COMPLETION">تحتاج إلى استكمال</option>
                    </select>
                  </div>

                  <div className="full">
                    <label htmlFor="matching-notes">ملاحظات المطابقة</label>
                    <textarea
                      id="matching-notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="اكتب تفاصيل نتيجة المراجعة..."
                    />
                  </div>
                </div>

                <div className="actions">
                  <button
                    type="button"
                    disabled={saving || !result}
                    onClick={() => sendAction("COMPLETE")}
                  >
                    {saving ? "جارٍ الحفظ..." : "حفظ نتيجة المطابقة"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="actions">
                <button
                  type="button"
                  disabled={saving || selected.documentRequirements.length === 0}
                  onClick={() => sendAction("START")}
                >
                  {saving ? "جارٍ التسجيل..." : "بدء المطابقة"}
                </button>
              </div>
            )}
          </section>
        </>
      )}

      {loading && <div className="empty">جارٍ تحميل الطلبات...</div>}
    </main>
  );
}
