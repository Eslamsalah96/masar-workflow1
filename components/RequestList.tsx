"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RequestItem = {
  id: string;
  requestNumber: string;
  serviceName: string;
  status: string;
  priority: string;
  receivedAt: string;
  createdAt: string;
  customer: {
    name: string;
    phone: string | null;
  };
  createdBy: {
    name: string;
  };
  currentDepartment: {
    name: string;
  } | null;
  _count: {
    tasks: number;
  };
};

const statusNames: Record<string, string> = {
  NEW: "جديد",
  PENDING_REVIEW: "بانتظار المراجعة",
  APPROVED: "معتمد",
  IN_PROGRESS: "قيد التنفيذ",
  COMPLETED: "مكتمل",
  REJECTED: "مرفوض",
  CLOSED: "مغلق",
};

const priorityNames: Record<string, string> = {
  NORMAL: "عادي",
  MEDIUM: "متوسط",
  URGENT: "عاجل",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default function RequestList() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadRequests() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        if (search.trim()) params.set("q", search.trim());
        if (status) params.set("status", status);

        const response = await fetch(
          `/api/requests?${params.toString()}`,
          { signal: controller.signal }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "تعذر تحميل الطلبات");
        }

        setRequests(result.requests || []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        setError(
          err instanceof Error ? err.message : "حدث خطأ غير متوقع"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadRequests();

    return () => controller.abort();
  }, [search, status]);

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">إدارة ومتابعة الطلبات</span>
          <h1>الطلبات</h1>
          <p>عرض الطلبات المسجلة ومتابعة حالتها الحالية.</p>
        </div>

        <Link href="/workflow/requests" className="primary-button">
          + تسجيل طلب جديد
        </Link>
      </div>

      <div className="request-filters">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث برقم الطلب أو اسم العميل أو الخدمة..."
          aria-label="البحث عن طلب"
        />

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="تصفية حسب الحالة"
        >
          <option value="">كل الحالات</option>
          <option value="PENDING_REVIEW">بانتظار المراجعة</option>
          <option value="APPROVED">معتمد</option>
          <option value="IN_PROGRESS">قيد التنفيذ</option>
          <option value="COMPLETED">مكتمل</option>
          <option value="REJECTED">مرفوض</option>
          <option value="CLOSED">مغلق</option>
        </select>
      </div>

      <div className="request-table-card">
        <div className="request-table-heading">
          <h2>قائمة الطلبات</h2>
          <span>{requests.length} طلب</span>
        </div>

        {loading ? (
          <div className="request-message">جاري تحميل الطلبات...</div>
        ) : error ? (
          <div className="request-message request-error">{error}</div>
        ) : requests.length === 0 ? (
          <div className="request-message">
            لا توجد طلبات تطابق البحث الحالي.
          </div>
        ) : (
          <div className="request-table-scroll">
            <table className="requests-table">
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>العميل / الشركة</th>
                  <th>الخدمة</th>
                  <th>القسم الحالي</th>
                  <th>تاريخ التسجيل</th>
                  <th>الأولوية</th>
                  <th>الحالة</th>
                  <th>التفاصيل</th>
                </tr>
              </thead>

              <tbody>
                {requests.map((item) => (
                  <tr key={item.id}>
                    <td className="request-number">
                      {item.requestNumber}
                    </td>
                    <td>
                      <strong>{item.customer?.name || "—"}</strong>
                      <small>{item.customer?.phone || "—"}</small>
                    </td>
                    <td>{item.serviceName}</td>
                    <td>{item.currentDepartment?.name || "—"}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>
                      <span
                        className={`priority-label priority-${item.priority.toLowerCase()}`}
                      >
                        {priorityNames[item.priority] || item.priority}
                      </span>
                    </td>
                    <td>
                      <span className="request-status">
                        {statusNames[item.status] || item.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        className="request-details-link"
                        href={`/requests/${item.id}`}
                      >
                        عرض التفاصيل
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}