"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Props = {
  requestId: string;
};

type RequestData = {
  id: string;
  requestNumber: string;
  serviceName: string;
  description: string | null;
  status: string;
  priority: string;
  customerType: string;
  proposedCompanyName: string | null;
  companyAlreadyEstablished: boolean;
  receivedAt: string;
  submittedAt: string | null;
  serviceStartedAt: string | null;
  deadlineAt: string | null;
  createdAt: string;
  customer: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    taxNumber: string | null;
  };
  createdBy: {
    name: string;
    email: string;
  };
  currentDepartment: {
    name: string;
  } | null;
  documentRequirements: {
    id: string;
    title: string;
    details: string | null;
    kind: string;
    isRequired: boolean;
    status: string;
    fileName: string | null;
    fileMimeType: string | null;
    fileSize: number | null;
    value: string | null;
  }[];
  questionAnswers: {
    questionLabel: string;
    answer: string;
  }[];
};

const statusNames: Record<string, string> = {
  NEW: "جديد",
  PENDING_REVIEW: "بانتظار مراجعة مدير الإجراءات",
  APPROVED: "معتمد",
  IN_PROGRESS: "قيد التنفيذ",
  COMPLETED: "مكتمل",
  REJECTED: "مرفوض",
  CLOSED: "مغلق",
};

function dateText(value: string | null) {
  if (!value) return "لم يحدد";

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function RequestDetails({ requestId }: Props) {
  const [data, setData] = useState<RequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadRequest() {
      try {
        const response = await fetch(`/api/requests/${requestId}`, {
          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "تعذر تحميل تفاصيل الطلب");
        }

        setData(result.request);
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

    loadRequest();

    return () => controller.abort();
  }, [requestId]);

  if (loading) {
    return <div className="request-message">جاري تحميل تفاصيل الطلب...</div>;
  }

  if (error || !data) {
    return (
      <div className="request-message request-error">
        {error || "الطلب غير موجود"}
        <p>
          <Link href="/requests">العودة إلى قائمة الطلبات</Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ملف الطلب</span>
          <h1>{data.requestNumber}</h1>
          <p>{data.serviceName}</p>
        </div>

        <Link href="/requests" className="secondary-button">
          العودة للطلبات
        </Link>
      </div>

      <div className="request-detail-status">
        <div>
          <span>الحالة الحالية</span>
          <strong>{statusNames[data.status] || data.status}</strong>
        </div>

        <div>
          <span>القسم الحالي</span>
          <strong>{data.currentDepartment?.name || "غير محدد"}</strong>
        </div>

        <div>
          <span>تاريخ التسجيل</span>
          <strong>{dateText(data.createdAt)}</strong>
        </div>
      </div>

      <section className="request-detail-card">
        <h2>بيانات العميل</h2>

        <div className="request-detail-grid">
          <Detail label="اسم العميل / الشركة" value={data.customer.name} />
          <Detail label="رقم الهاتف" value={data.customer.phone} />
          <Detail label="البريد الإلكتروني" value={data.customer.email} />
          <Detail label="العنوان" value={data.customer.address} />
          <Detail label="الرقم الضريبي" value={data.customer.taxNumber} />
          <Detail
            label="نوع العميل"
            value={
              data.customerType === "EXISTING"
                ? "عميل حالي"
                : "عميل جديد"
            }
          />
          <Detail
            label="اسم الشركة المقترح"
            value={data.proposedCompanyName}
          />
          <Detail
            label="حالة الشركة"
            value={
              data.companyAlreadyEstablished
                ? "شركة قائمة بالفعل"
                : "شركة تحت التأسيس"
            }
          />
        </div>
      </section>

      <section className="request-detail-card">
        <h2>بيانات الخدمة والطلب</h2>

        <div className="request-detail-grid">
          <Detail label="الخدمة" value={data.serviceName} />
          <Detail label="الأولوية" value={data.priority} />
          <Detail label="تاريخ الاستلام" value={dateText(data.receivedAt)} />
          <Detail label="تاريخ الإرسال للمراجعة" value={dateText(data.submittedAt)} />
          <Detail label="بداية تنفيذ الخدمة" value={dateText(data.serviceStartedAt)} />
          <Detail label="الموعد المستهدف" value={dateText(data.deadlineAt)} />
          <Detail label="سجل الطلب بواسطة" value={data.createdBy.name} />
        </div>

        <div className="request-description">
          <strong>وصف الطلب</strong>
          <p>{data.description || "لا يوجد وصف إضافي."}</p>
        </div>
      </section>

      <section className="request-detail-card">
        <h2>المستندات المطلوبة</h2>

        {data.documentRequirements.length === 0 ? (
          <p className="muted-text">لا توجد مستندات مسجلة لهذا الطلب.</p>
        ) : (
          <div className="document-list">
            {data.documentRequirements.map((document) => (
              <div className="document-row" key={document.id}>
                <div>
                  <strong>{document.title}</strong>
                  <small>
                    {document.kind === "DATA" ? "بيانات" : "مستند"}
                    {document.isRequired ? " · مطلوب" : " · اختياري"}
                  </small>

                  {document.value && (
                    <p>{document.value}</p>
                  )}

                  {document.fileName && (
                    <small>{document.fileName}</small>
                  )}
                </div>

                <span
                  className={
                    document.status === "RECEIVED"
                      ? "document-received"
                      : "document-missing"
                  }
                >
                  {document.status === "RECEIVED"
                    ? "تم الاستلام"
                    : "لم يتم الاستلام"}
                </span>

                {document.fileName && (
                  <a
                    className="request-details-link"
                    href={`/api/requests/${data.id}/documents/${document.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    فتح المستند
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="request-detail-card">
        <h2>إجابات بيانات الخدمة</h2>

        {data.questionAnswers.length === 0 ? (
          <p className="muted-text">لا توجد إجابات مسجلة.</p>
        ) : (
          <div className="request-detail-grid">
            {data.questionAnswers.map((item, index) => (
              <Detail
                key={`${item.questionLabel}-${index}`}
                label={item.questionLabel}
                value={item.answer}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="request-detail-field">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}