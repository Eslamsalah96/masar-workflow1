
"use client";

import { useCallback, useEffect, useState } from "react";

type Department = {
  id: string;
  name: string;
};

type RequestItem = {
  id: string;
  requestNumber: string;
  serviceName: string;
  status: string;
  currentDepartmentId: string | null;
  customer: { name: string } | null;
  currentDepartment: { name: string } | null;
};

export default function TransferManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [requestId, setRequestId] = useState("");
  const [toDepartmentId, setToDepartmentId] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/transfers", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر تحميل بيانات التحويل");
      }

      setDepartments(data.departments || []);
      setRequests(data.requests || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء تحميل البيانات"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedRequest = requests.find((item) => item.id === requestId);

  const availableDepartments = departments.filter(
    (department) => department.id !== selectedRequest?.currentDepartmentId
  );

  const filteredRequests = requests.filter((item) => {
    const searchText = search.trim().toLowerCase();

    return (
      !searchText ||
      item.requestNumber.toLowerCase().includes(searchText) ||
      item.serviceName.toLowerCase().includes(searchText) ||
      (item.customer?.name || "").toLowerCase().includes(searchText) ||
      (item.currentDepartment?.name || "").toLowerCase().includes(searchText)
    );
  });

  async function handleTransfer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!requestId || !toDepartmentId) {
      setError("اختر الطلب والقسم المستلم أولاً");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          toDepartmentId,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر تحويل الطلب");
      }

      setSuccess(data.message || "تم تحويل الطلب بنجاح");
      setRequestId("");
      setToDepartmentId("");
      setNotes("");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء تحويل الطلب"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="transfer-page" dir="rtl">
      <style jsx>{`
        .transfer-page {
          color: #183247;
          display: grid;
          gap: 22px;
          padding: 4px 0 30px;
        }
        .page-heading h1 {
          margin: 0 0 7px;
          font-size: 25px;
          font-weight: 800;
        }
        .page-heading p {
          margin: 0;
          color: #718096;
          font-size: 14px;
        }
        .panel {
          background: #fff;
          border: 1px solid #e6edf3;
          border-radius: 16px;
          padding: 22px;
          box-shadow: 0 5px 18px rgba(20, 50, 75, 0.04);
        }
        .panel-title {
          margin: 0 0 19px;
          font-size: 17px;
          font-weight: 800;
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 17px;
        }
        .field {
          display: grid;
          gap: 8px;
        }
        .field.full {
          grid-column: 1 / -1;
        }
        label {
          color: #34495e;
          font-size: 13px;
          font-weight: 700;
        }
        input,
        select,
        textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #dce5ed;
          border-radius: 9px;
          background: #fff;
          color: #243b53;
          padding: 12px 13px;
          font: inherit;
          font-size: 14px;
          outline: none;
        }
        input:focus,
        select:focus,
        textarea:focus {
          border-color: #2876a8;
          box-shadow: 0 0 0 3px rgba(40, 118, 168, 0.1);
        }
        textarea {
          min-height: 85px;
          resize: vertical;
        }
        .hint {
          color: #8493a3;
          font-size: 12px;
        }
        .submit {
          border: 0;
          border-radius: 9px;
          background: #1e5b85;
          color: white;
          padding: 12px 22px;
          font: inherit;
          font-weight: 700;
          cursor: pointer;
          min-width: 150px;
        }
        .submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .alert {
          border-radius: 9px;
          padding: 12px 14px;
          font-size: 13px;
          font-weight: 600;
        }
        .alert.error {
          color: #a12c35;
          background: #fff0f0;
          border: 1px solid #ffd8d8;
        }
        .alert.success {
          color: #176344;
          background: #eaf8f0;
          border: 1px solid #c9eed9;
        }
        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .table-header h2 {
          margin: 0;
          font-size: 17px;
        }
        .search {
          max-width: 300px;
        }
        .table-wrap {
          overflow-x: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 650px;
        }
        th {
          background: #f5f8fb;
          color: #64788a;
          font-size: 12px;
          font-weight: 800;
          text-align: right;
          padding: 13px;
          white-space: nowrap;
        }
        td {
          border-bottom: 1px solid #edf1f5;
          padding: 14px 13px;
          font-size: 13px;
          color: #34495e;
        }
        tbody tr:last-child td {
          border-bottom: 0;
        }
        .number {
          color: #1e5b85;
          font-weight: 800;
          white-space: nowrap;
        }
        .department {
          display: inline-block;
          background: #edf5fb;
          color: #1e5b85;
          border-radius: 20px;
          padding: 5px 10px;
          font-size: 12px;
          font-weight: 700;
        }
        .empty {
          text-align: center;
          padding: 30px;
          color: #8291a0;
          font-size: 14px;
        }
        @media (max-width: 700px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
          .field.full {
            grid-column: auto;
          }
          .panel {
            padding: 16px;
          }
          .table-header {
            align-items: stretch;
            flex-direction: column;
          }
          .search {
            max-width: none;
          }
        }
      `}</style>

      <header className="page-heading">
        <h1>تحويل الطلبات</h1>
        <p>تحويل الطلب إلى القسم المختص لمتابعة واستكمال الإجراءات</p>
      </header>

      <section className="panel">
        <h2 className="panel-title">بيانات التحويل</h2>

        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}

        <form onSubmit={handleTransfer}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="transfer-request">الطلب المراد تحويله *</label>
              <select
                id="transfer-request"
                value={requestId}
                onChange={(event) => {
                  setRequestId(event.target.value);
                  setToDepartmentId("");
                }}
                required
              >
                <option value="">اختر الطلب</option>
                {requests.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.requestNumber} — {item.customer?.name || "بدون عميل"} 
                  </option>
                ))}
              </select>
              <span className="hint">
                اختر الطلب الذي تريد إرساله إلى قسم آخر
              </span>
            </div>

            <div className="field">
              <label htmlFor="transfer-department">القسم المستلم *</label>
              <select
                id="transfer-department"
                value={toDepartmentId}
                onChange={(event) => setToDepartmentId(event.target.value)}
                required
                disabled={!requestId}
              >
                <option value="">
                  {requestId ? "اختر القسم المستلم" : "اختر الطلب أولاً"}
                </option>
                {availableDepartments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
              <span className="hint">
                التحويل يكون إلى قسم، وليس إلى موظف محدد
              </span>
            </div>

            {selectedRequest && (
              <div className="field full">
                <label>القسم الحالي للطلب</label>
                <div>
                  <span className="department">
                    {selectedRequest.currentDepartment?.name || "لم يتم تحديد قسم"}
                  </span>
                </div>
              </div>
            )}

            <div className="field full">
              <label htmlFor="transfer-notes">ملاحظات التحويل</label>
              <textarea
                id="transfer-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="اكتب أي تعليمات أو ملاحظات للقسم المستلم..."
              />
            </div>

            <div className="field full">
              <div>
                <button className="submit" type="submit" disabled={saving || loading}>
                  {saving ? "جارٍ التحويل..." : "تحويل الطلب"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="table-header">
          <h2>الطلبات المتاحة للتحويل</h2>
          <input
            className="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث برقم الطلب أو العميل أو القسم..."
          />
        </div>

        {loading ? (
          <div className="empty">جارٍ تحميل الطلبات...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="empty">لا توجد طلبات مطابقة لعملية البحث</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>اسم العميل</th>
                  <th>الخدمة</th>
                  <th>القسم الحالي</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((item) => (
                  <tr key={item.id}>
                    <td className="number">{item.requestNumber}</td>
                    <td>{item.customer?.name || "—"}</td>
                    <td>{item.serviceName}</td>
                    <td>
                      {item.currentDepartment?.name || "لم يتم التحويل"}
                    </td>
                    <td>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
