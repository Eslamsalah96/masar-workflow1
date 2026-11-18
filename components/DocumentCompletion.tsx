
"use client";

import { useCallback, useEffect, useState } from "react";

type RequestItem = {
  id: string;
  requestNumber: string;
  serviceName: string;
  customer?: { name: string } | null;
  currentDepartment?: { name: string } | null;
};

type DocumentItem = {
  id: string;
  title: string;
  details?: string | null;
  isRequired: boolean;
  status: string;
  fileName?: string | null;
  fileMimeType?: string | null;
  fileSize?: number | null;
  receivedAt?: string | null;
};

export default function DocumentCompletion() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [requestId, setRequestId] = useState("");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [loading, setLoading] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [uploadingId, setUploadingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/requests", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر تحميل الطلبات");
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

  const loadDocuments = useCallback(async (id: string) => {
    setLoadingDocuments(true);
    setError("");
    setDocuments([]);
    setFiles({});

    try {
      const response = await fetch(`/api/requests/${id}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر تحميل مستندات الطلب");
      }

      setDocuments(data.request?.documentRequirements || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء تحميل المستندات"
      );
    } finally {
      setLoadingDocuments(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function handleUpload(documentId: string) {
    const file = files[documentId];

    if (!requestId || !file) {
      setError("اختر ملف المستند أولاً");
      return;
    }

    setUploadingId(documentId);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("documentId", documentId);
      formData.append("file", file);

      const response = await fetch(
        `/api/requests/${requestId}/documents/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر رفع المستند");
      }

      setSuccess(data.message || "تم رفع المستند بنجاح");

      setFiles((current) => {
        const next = { ...current };
        delete next[documentId];
        return next;
      });

      await loadDocuments(requestId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء رفع المستند"
      );
    } finally {
      setUploadingId("");
    }
  }

  const receivedCount = documents.filter(
    (document) => document.status === "RECEIVED"
  ).length;

  const requiredCount = documents.filter(
    (document) => document.isRequired
  ).length;

  const missingRequiredCount = documents.filter(
    (document) =>
      document.isRequired && document.status !== "RECEIVED"
  ).length;

  return (
    <main className="documents-page" dir="rtl">
      <style jsx>{`
        .documents-page {
          display: grid;
          gap: 20px;
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
        input[type="file"] {
          width: 100%;
          box-sizing: border-box;
          padding: 12px;
          border: 1px solid #dce5ed;
          border-radius: 9px;
          background: white;
          font: inherit;
          font-size: 13px;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .stat {
          padding: 15px;
          background: #f5f8fb;
          border-radius: 11px;
        }
        .stat span {
          display: block;
          color: #718096;
          font-size: 12px;
          margin-bottom: 7px;
        }
        .stat strong {
          font-size: 22px;
          color: #1e5b85;
        }
        .document {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(220px, 0.8fr);
          gap: 18px;
          align-items: center;
          padding: 17px 0;
          border-bottom: 1px solid #edf1f5;
        }
        .document:last-child {
          border-bottom: 0;
        }
        .document h3 {
          margin: 0 0 6px;
          font-size: 15px;
        }
        .document p {
          margin: 0 0 8px;
          color: #718096;
          font-size: 12px;
        }
        .status {
          display: inline-block;
          border-radius: 20px;
          padding: 5px 10px;
          font-size: 11px;
          font-weight: 700;
          background: #fff2e6;
          color: #a65b16;
        }
        .status.received {
          background: #eaf8f0;
          color: #176344;
        }
        .upload-area {
          display: grid;
          gap: 9px;
        }
        .upload-button {
          border: 0;
          border-radius: 8px;
          background: #1e5b85;
          color: white;
          padding: 10px 15px;
          font: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .upload-button:disabled {
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
          color: #a12c35;
          background: #fff0f0;
        }
        .success {
          color: #176344;
          background: #eaf8f0;
        }
        .empty {
          text-align: center;
          padding: 28px;
          color: #8291a0;
          font-size: 14px;
        }
        .required {
          color: #b45309;
          font-size: 11px;
          margin-right: 6px;
        }
        @media (max-width: 650px) {
          .stats {
            grid-template-columns: 1fr;
          }
          .document {
            grid-template-columns: 1fr;
          }
          .panel {
            padding: 15px;
          }
        }
      `}</style>

      <div className="heading">
        <h2>استكمال مستندات الطلب</h2>
        <p>اختر الطلب لمراجعة المستندات المطلوبة ورفع الملفات الناقصة</p>
      </div>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <section className="panel">
        <label htmlFor="document-request">اختر الطلب</label>
        <select
          id="document-request"
          value={requestId}
          onChange={(event) => {
            const id = event.target.value;
            setRequestId(id);
            setSuccess("");
            if (id) loadDocuments(id);
            else setDocuments([]);
          }}
        >
          <option value="">اختر الطلب لعرض مستنداته</option>
          {requests.map((item) => (
            <option key={item.id} value={item.id}>
              {item.requestNumber} — {item.customer?.name || "بدون عميل"}
            </option>
          ))}
        </select>
      </section>

      {requestId && (
        <>
          <section className="stats">
            <div className="stat">
              <span>إجمالي المستندات المطلوبة</span>
              <strong>{documents.length}</strong>
            </div>
            <div className="stat">
              <span>المستندات المستلمة</span>
              <strong>{receivedCount}</strong>
            </div>
            <div className="stat">
              <span>المستندات المطلوبة الناقصة</span>
              <strong>{missingRequiredCount}</strong>
            </div>
          </section>

          <section className="panel">
            {loadingDocuments ? (
              <div className="empty">جارٍ تحميل المستندات...</div>
            ) : documents.length === 0 ? (
              <div className="empty">
                لا توجد مستندات مسجلة لهذا الطلب
              </div>
            ) : (
              <>
                <div>
                  {documents.map((document) => (
                    <div className="document" key={document.id}>
                      <div>
                        <h3>
                          {document.title}
                          {document.isRequired && (
                            <span className="required">مطلوب</span>
                          )}
                        </h3>
                        {document.details && <p>{document.details}</p>}
                        <span
                          className={`status ${
                            document.status === "RECEIVED" ? "received" : ""
                          }`}
                        >
                          {document.status === "RECEIVED"
                            ? "تم الاستلام"
                            : "لم يتم الاستلام"}
                        </span>
                        {document.fileName && (
                          <p style={{ marginTop: 8 }}>
                            الملف الحالي: {document.fileName}
                          </p>
                        )}
                      </div>

                      <div className="upload-area">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              setFiles((current) => ({
                                ...current,
                                [document.id]: file,
                              }));
                            }
                          }}
                        />
                        <button
                          className="upload-button"
                          type="button"
                          disabled={
                            !files[document.id] ||
                            uploadingId === document.id
                          }
                          onClick={() => handleUpload(document.id)}
                        >
                          {uploadingId === document.id
                            ? "جارٍ الرفع..."
                            : document.status === "RECEIVED"
                              ? "استبدال الملف"
                              : "رفع المستند"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <p style={{ color: "#718096", fontSize: 12, marginBottom: 0 }}>
                  المستندات المستلمة: {receivedCount} من {documents.length}
                  {requiredCount > 0 &&
                    ` — المستندات الإلزامية: ${requiredCount}`}
                </p>
              </>
            )}
          </section>
        </>
      )}

      {loading && <div className="empty">جارٍ تحميل الطلبات...</div>}
    </main>
  );
}
