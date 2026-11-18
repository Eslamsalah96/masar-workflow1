
"use client";

import { useCallback, useEffect, useState } from "react";

type Expense = {
  id: string;
  amount: number;
  description: string;
  employeeName: string;
  createdAt: string;
};

type ReportRow = {
  id: string;
  type: "REGULAR" | "DAILY";
  title: string;
  requestNumber: string;
  customerName: string;
  companyName: string;
  serviceName: string;
  departmentName: string;
  employeeName: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  deadlineAt: string | null;
  completedAt: string | null;
  totalSeconds: number;
  expensesTotal: number;
  expenses: Expense[];
};

type ReportSummary = {
  totalTasks: number;
  regularTasks: number;
  dailyTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  totalExpenses: number;
  totalWorkSeconds: number;
};

type ReportResponse = {
  rows: ReportRow[];
  summary: ReportSummary;
};

const emptySummary: ReportSummary = {
  totalTasks: 0,
  regularTasks: 0,
  dailyTasks: 0,
  completedTasks: 0,
  inProgressTasks: 0,
  pendingTasks: 0,
  totalExpenses: 0,
  totalWorkSeconds: 0,
};

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, seconds || 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  return `${hours} ساعة و ${minutes} دقيقة`;
}

function formatMoney(amount: number) {
  return `${Number(amount || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 2,
  })} ج.م`;
}

function getStatusLabel(status: string) {
  const statuses: Record<string, string> = {
    NEW: "جديد",
    PENDING: "قيد الانتظار",
    IN_PROGRESS: "قيد التنفيذ",
    COMPLETED: "مكتملة",
    CANCELLED: "ملغاة",
    ON_HOLD: "متوقفة مؤقتًا",
    REVIEW: "قيد المراجعة",
  };

  return statuses[status] || status || "غير محدد";
}

function getStatusClass(status: string) {
  if (status === "COMPLETED") return "completed";
  if (status === "IN_PROGRESS") return "progress";
  if (status === "CANCELLED") return "cancelled";
  return "pending";
}

export default function ReportsManagement() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState("ALL");

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [summary, setSummary] = useState<ReportSummary>(emptySummary);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("type", type);

      const response = await fetch(`/api/reports?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر تحميل التقارير");
      }

      const data = result as ReportResponse;

      setRows(Array.isArray(data.rows) ? data.rows : []);
      setSummary(data.summary || emptySummary);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل التقارير"
      );
    } finally {
      setLoading(false);
    }
  }, [from, to, type]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const resetFilters = () => {
    setFrom("");
    setTo("");
    setType("ALL");
  };

  const stats = [
    {
      title: "إجمالي المهام",
      value: summary.totalTasks,
      icon: "▤",
      color: "blue",
    },
    {
      title: "المهام العادية",
      value: summary.regularTasks,
      icon: "✓",
      color: "purple",
    },
    {
      title: "المهام اليومية",
      value: summary.dailyTasks,
      icon: "◷",
      color: "orange",
    },
    {
      title: "المهام المكتملة",
      value: summary.completedTasks,
      icon: "✔",
      color: "green",
    },
    {
      title: "قيد التنفيذ",
      value: summary.inProgressTasks,
      icon: "↻",
      color: "cyan",
    },
    {
      title: "قيد الانتظار",
      value: summary.pendingTasks,
      icon: "…",
      color: "gray",
    },
  ];

  return (
    <main className="reports-page" dir="rtl">
      <div className="page-heading">
        <div>
          <h1>التقارير</h1>
          <p>متابعة أداء المهام وساعات العمل والمصروفات</p>
        </div>

        <button
          type="button"
          className="refresh-button"
          onClick={loadReports}
          disabled={loading}
        >
          {loading ? "جاري التحديث..." : "↻ تحديث البيانات"}
        </button>
      </div>

      <section className="filter-panel">
        <div className="filter-heading">
          <div>
            <h2>تصفية التقارير</h2>
            <p>حدد الفترة ونوع المهام المطلوب عرضها</p>
          </div>
        </div>

        <div className="filters">
          <label>
            <span>من تاريخ</span>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>

          <label>
            <span>إلى تاريخ</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>

          <label>
            <span>نوع المهام</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="ALL">كل المهام</option>
              <option value="REGULAR">المهام العادية فقط</option>
              <option value="DAILY">المهام اليومية فقط</option>
            </select>
          </label>

          <div className="filter-actions">
            <button
              type="button"
              className="apply-button"
              onClick={loadReports}
              disabled={loading}
            >
              تطبيق الفلتر
            </button>

            <button
              type="button"
              className="reset-button"
              onClick={resetFilters}
            >
              إعادة ضبط
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <section className="stats-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.title}>
            <div className={`stat-icon ${stat.color}`}>
              {stat.icon}
            </div>

            <div>
              <span>{stat.title}</span>
              <strong>{stat.value.toLocaleString("ar-EG")}</strong>
            </div>
          </div>
        ))}
      </section>

      <section className="financial-grid">
        <div className="financial-card">
          <span>إجمالي ساعات العمل</span>
          <strong>{formatDuration(summary.totalWorkSeconds)}</strong>
          <small>وفق جلسات العمل المسجلة</small>
        </div>

        <div className="financial-card">
          <span>إجمالي المصروفات</span>
          <strong>{formatMoney(summary.totalExpenses)}</strong>
          <small>مصروفات المهام العادية واليومية</small>
        </div>
      </section>

      <section className="report-table-section">
        <div className="table-heading">
          <div>
            <h2>تفاصيل المهام</h2>
            <p>
              عدد النتائج: {rows.length.toLocaleString("ar-EG")}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            جاري تحميل بيانات التقارير...
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">▤</div>
            <strong>لا توجد بيانات لعرضها</strong>
            <p>جرّب تغيير الفترة الزمنية أو نوع المهام.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>نوع المهمة</th>
                  <th>المهمة / الخدمة</th>
                  <th>رقم الطلب</th>
                  <th>العميل</th>
                  <th>الشركة</th>
                  <th>القسم</th>
                  <th>الموظف</th>
                  <th>الحالة</th>
                  <th>تاريخ التسجيل</th>
                  <th>بداية التنفيذ</th>
                  <th>الموعد النهائي</th>
                  <th>وقت العمل</th>
                  <th>المصروفات</th>
                  <th>تفاصيل المصروفات</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.type}-${row.id}`}>
                    <td>
                      <span
                        className={`type-badge ${
                          row.type === "DAILY" ? "daily" : "regular"
                        }`}
                      >
                        {row.type === "DAILY" ? "يومية" : "عادية"}
                      </span>
                    </td>

                    <td>
                      <strong>{row.serviceName || row.title}</strong>
                      {row.title !== row.serviceName && row.serviceName && (
                        <small className="sub-text">{row.title}</small>
                      )}
                    </td>

                    <td>{row.requestNumber || "—"}</td>
                    <td>{row.customerName || "—"}</td>
                    <td>{row.companyName || "—"}</td>
                    <td>{row.departmentName || "—"}</td>
                    <td>{row.employeeName || "غير معين"}</td>

                    <td>
                      <span className={`status-badge ${getStatusClass(row.status)}`}>
                        {getStatusLabel(row.status)}
                      </span>
                    </td>

                    <td>{formatDate(row.createdAt)}</td>
                    <td>{formatDateTime(row.startedAt)}</td>
                    <td>{formatDate(row.deadlineAt)}</td>

                    <td className="duration-cell">
                      {formatDuration(row.totalSeconds)}
                    </td>

                    <td className="money-cell">
                      {formatMoney(row.expensesTotal)}
                    </td>

                    <td>
                      {row.expenses.length === 0 ? (
                        <span className="muted">لا توجد مصروفات</span>
                      ) : (
                        <details className="expenses-details">
                          <summary>
                            عرض ({row.expenses.length})
                          </summary>

                          <div className="expenses-list">
                            {row.expenses.map((expense) => (
                              <div className="expense-item" key={expense.id}>
                                <strong>{formatMoney(expense.amount)}</strong>
                                <span>{expense.description}</span>
                                <small>
                                  الموظف: {expense.employeeName}
                                </small>
                                <small>
                                  التاريخ: {formatDateTime(expense.createdAt)}
                                </small>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <style jsx>{`
        .reports-page {
          width: 100%;
          color: #243447;
        }

        .page-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .page-heading h1 {
          margin: 0 0 7px;
          font-size: 25px;
          color: #123b5d;
        }

        .page-heading p,
        .filter-heading p,
        .table-heading p {
          margin: 0;
          color: #7b8794;
          font-size: 13px;
        }

        button {
          font: inherit;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .refresh-button,
        .apply-button {
          border: 0;
          border-radius: 8px;
          background: #1e5b85;
          color: white;
          padding: 11px 17px;
          font-weight: 600;
        }

        .filter-panel,
        .report-table-section {
          background: white;
          border: 1px solid #e8edf2;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .filter-heading,
        .table-heading {
          margin-bottom: 18px;
        }

        .filter-heading h2,
        .table-heading h2 {
          margin: 0 0 6px;
          color: #123b5d;
          font-size: 17px;
        }

        .filters {
          display: grid;
          grid-template-columns: repeat(3, minmax(150px, 1fr)) auto;
          gap: 13px;
          align-items: end;
        }

        .filters label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          font-size: 13px;
          font-weight: 600;
          color: #526273;
        }

        input,
        select {
          width: 100%;
          min-height: 42px;
          padding: 9px 11px;
          border: 1px solid #dce4ec;
          border-radius: 8px;
          background: white;
          color: #263746;
          font: inherit;
          box-sizing: border-box;
        }

        input:focus,
        select:focus {
          outline: 2px solid #d4e8f6;
          border-color: #1e5b85;
        }

        .filter-actions {
          display: flex;
          gap: 8px;
        }

        .reset-button {
          border: 1px solid #dce4ec;
          background: white;
          color: #526273;
          border-radius: 8px;
          padding: 10px 14px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 16px;
        }

        .stat-card {
          background: white;
          border: 1px solid #e8edf2;
          border-radius: 11px;
          padding: 17px;
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .stat-icon {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          font-size: 20px;
          font-weight: bold;
        }

        .stat-icon.blue {
          background: #e8f2fa;
          color: #1e5b85;
        }

        .stat-icon.purple {
          background: #f0ebff;
          color: #7654bd;
        }

        .stat-icon.orange {
          background: #fff2e4;
          color: #c77b24;
        }

        .stat-icon.green {
          background: #e8f7ef;
          color: #248451;
        }

        .stat-icon.cyan {
          background: #e5f7fa;
          color: #238899;
        }

        .stat-icon.gray {
          background: #eef1f4;
          color: #697786;
        }

        .stat-card span,
        .financial-card span {
          display: block;
          color: #778493;
          font-size: 12px;
          margin-bottom: 7px;
        }

        .stat-card strong {
          display: block;
          color: #193d59;
          font-size: 22px;
        }

        .financial-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .financial-card {
          background: white;
          border: 1px solid #e8edf2;
          border-radius: 11px;
          padding: 18px;
        }

        .financial-card strong {
          display: block;
          color: #123b5d;
          font-size: 21px;
          margin-bottom: 6px;
        }

        .financial-card small {
          color: #8995a1;
          font-size: 12px;
        }

        .table-scroll {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          min-width: 1450px;
          border-collapse: collapse;
          text-align: right;
          font-size: 12px;
        }

        th {
          padding: 13px 11px;
          background: #f5f8fb;
          color: #526273;
          font-weight: 700;
          white-space: nowrap;
          border-bottom: 1px solid #e6edf3;
        }

        td {
          padding: 13px 11px;
          border-bottom: 1px solid #edf1f5;
          color: #435365;
          vertical-align: middle;
          white-space: nowrap;
        }

        tbody tr:hover {
          background: #fafcfe;
        }

        td strong {
          color: #263f55;
        }

        .sub-text {
          display: block;
          margin-top: 4px;
          color: #8794a1;
          font-size: 11px;
        }

        .type-badge,
        .status-badge {
          display: inline-block;
          border-radius: 20px;
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 600;
        }

        .type-badge.daily {
          background: #fff1df;
          color: #a96918;
        }

        .type-badge.regular {
          background: #e8f2fa;
          color: #1e5b85;
        }

        .status-badge.completed {
          background: #e7f6ed;
          color: #25804c;
        }

        .status-badge.progress {
          background: #e8f3fc;
          color: #1d689b;
        }

        .status-badge.pending {
          background: #fff5df;
          color: #9b701a;
        }

        .status-badge.cancelled {
          background: #fdebec;
          color: #b23a42;
        }

        .duration-cell,
        .money-cell {
          font-weight: 700;
          color: #193d59;
        }

        .muted {
          color: #9aa4ae;
          font-size: 11px;
        }

        .expenses-details {
          position: relative;
        }

        .expenses-details summary {
          cursor: pointer;
          color: #1e5b85;
          font-weight: 600;
        }

        .expenses-list {
          position: absolute;
          z-index: 5;
          top: 25px;
          right: 0;
          width: 250px;
          max-height: 260px;
          overflow-y: auto;
          padding: 10px;
          background: white;
          border: 1px solid #e1e8ef;
          border-radius: 9px;
          box-shadow: 0 8px 25px #193d591c;
          white-space: normal;
        }

        .expense-item {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 9px 4px;
          border-bottom: 1px solid #edf1f5;
        }

        .expense-item:last-child {
          border-bottom: 0;
        }

        .expense-item strong {
          color: #248451;
        }

        .expense-item span {
          color: #435365;
        }

        .expense-item small {
          color: #8794a1;
        }

        .empty-state {
          padding: 45px 15px;
          text-align: center;
          color: #82909d;
        }

        .empty-state strong {
          display: block;
          margin: 10px 0 6px;
          color: #40566a;
        }

        .empty-state p {
          margin: 0;
          font-size: 13px;
        }

        .empty-icon {
          font-size: 30px;
          color: #9aabb9;
        }

        .error-message {
          background: #fff0f0;
          border: 1px solid #f2cccc;
          color: #a93636;
          border-radius: 9px;
          padding: 12px 15px;
          margin-bottom: 16px;
        }

        @media (max-width: 1050px) {
          .filters {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .page-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .filters,
          .stats-grid,
          .financial-grid {
            grid-template-columns: 1fr;
          }

          .filter-actions {
            grid-column: 1 / -1;
          }

          .filter-actions button {
            flex: 1;
          }

          .filter-panel,
          .report-table-section {
            padding: 14px;
          }
        }
      `}</style>
    </main>
  );
}
