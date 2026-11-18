
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type CustomerDocument = {
  id: string;
  documentType: string;
  documentNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  filePath: string | null;
  notes: string | null;
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxNumber: string | null;
  notes: string | null;
  documents: CustomerDocument[];
};

type ServiceQuestion = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  type: string;
  optionsJson: string | null;
  isRequired: boolean;
  sortOrder: number;
};

type RequirementCondition = {
  id: string;
  questionId: string;
  expectedValue: string;
  groupKey: string;
  question: {
    id: string;
    code: string;
    label: string;
  };
};

type DocumentRequirement = {
  id: string;
  code: string;
  title: string;
  details: string | null;
  condition: string | null;
  isRequired: boolean;
  sortOrder: number;
  applicability?: string;
  kind?: string;
  conditions?: RequirementCondition[];
};

type ServiceVariant = {
  id: string;
  name: string;
  serviceId: string;
  documentRequirements: DocumentRequirement[];
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  category: { name: string };
  variants: ServiceVariant[];
  documentRequirements: DocumentRequirement[];
  questions: ServiceQuestion[];
};

type CustomerCategory =
  | "NEW_UNESTABLISHED"
  | "NEW_ESTABLISHED"
  | "EXISTING";

type AddedDocument = {
  documentType: string;
  documentNumber: string;
  expiryDate: string;
  notes: string;
};

const documentTypes = [
  "البطاقة الضريبية",
  "شهادة التسجيل في ضريبة القيمة المضافة",
  "سجل تجاري",
  "بطاقة استيرادية",
  "بطاقة تصديرية",
  "رخصة إنشاءات",
  "توكيل",
  "مستند آخر",
];

const emptyCustomer = {
  name: "",
  phone: "",
  email: "",
  address: "",
  taxNumber: "",
  notes: "",
};

const categoryLabels: Record<CustomerCategory, string> = {
  NEW_UNESTABLISHED: "عميل جديد – شركة تحت التأسيس",
  NEW_ESTABLISHED: "عميل جديد – شركة متأسسة بالفعل",
  EXISTING: "عميل حالي – لديه ملف سابق",
};

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(0)} كيلوبايت`;
  }
  return `${(size / (1024 * 1024)).toFixed(2)} ميجابايت`;
}

function parseQuestionOptions(optionsJson: string | null): string[] {
  if (!optionsJson) return [];

  try {
    const parsed = JSON.parse(optionsJson);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item.label === "string") return item.label;
        if (item && typeof item.value === "string") return item.value;
        return "";
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function requirementMatchesAnswers(
  requirement: DocumentRequirement,
  answers: Record<string, string>
) {
  const conditions = requirement.conditions || [];

  // المتطلب الذي ليس له شروط يظهر دائمًا.
  if (conditions.length === 0) return true;

  // الشروط داخل المجموعة الواحدة تعمل بمنطق AND،
  // والمجموعات المختلفة تعمل بمنطق OR.
  const groups = new Map<string, RequirementCondition[]>();

  for (const condition of conditions) {
    const groupKey = condition.groupKey || "DEFAULT";
    const current = groups.get(groupKey) || [];
    current.push(condition);
    groups.set(groupKey, current);
  }

  return Array.from(groups.values()).some((group) =>
    group.every(
      (condition) =>
        answers[condition.question.code] === condition.expectedValue
    )
  );
}

export default function RequestRegistration() {
  const [customerCategory, setCustomerCategory] =
    useState<CustomerCategory>("NEW_UNESTABLISHED");

  const [proposedCompanyName, setProposedCompanyName] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [searching, setSearching] = useState(false);

  const [customer, setCustomer] = useState(emptyCustomer);

  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [serviceId, setServiceId] = useState("");
  const [serviceVariantId, setServiceVariantId] = useState("");

  const [questionAnswers, setQuestionAnswers] = useState<
    Record<string, string>
  >({});
  const [dataValues, setDataValues] = useState<Record<string, string>>({});

  const [request, setRequest] = useState({
    description: "",
    priority: "NORMAL",
  });

  const [documents, setDocuments] = useState<AddedDocument[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadServices() {
      try {
        const response = await fetch("/api/services");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "تعذر تحميل الخدمات");
        }

        setServices(data.services || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "حدث خطأ أثناء تحميل الخدمات"
        );
      } finally {
        setServicesLoading(false);
      }
    }

    loadServices();
  }, []);

  const selectedService = services.find((item) => item.id === serviceId);

  const selectedVariant = selectedService?.variants.find(
    (item) => item.id === serviceVariantId
  );

  const applicability =
    customerCategory === "EXISTING"
      ? "EXISTING"
      : customerCategory === "NEW_ESTABLISHED"
        ? "NEW_ESTABLISHED"
        : "NEW_UNESTABLISHED";

  const serviceQuestions = useMemo(
    () =>
      [...(selectedService?.questions || [])].sort(
        (a, b) => a.sortOrder - b.sortOrder
      ),
    [selectedService]
  );

  const allRequirements = useMemo(() => {
    const general = selectedService?.documentRequirements || [];
    const variant = selectedVariant?.documentRequirements || [];
    const unique = new Map<string, DocumentRequirement>();

    [...general, ...variant].forEach((item) => {
      if (
        !item.applicability ||
        item.applicability === "ALL" ||
        item.applicability === applicability
      ) {
        unique.set(item.id, item);
      }
    });

    return Array.from(unique.values()).sort(
      (a, b) => a.sortOrder - b.sortOrder
    );
  }, [selectedService, selectedVariant, applicability]);

  const requiredDocuments = useMemo(
    () =>
      allRequirements.filter((item) =>
        requirementMatchesAnswers(item, questionAnswers)
      ),
    [allRequirements, questionAnswers]
  );

  const documentRequirements = requiredDocuments.filter(
    (item) => (item.kind || "DOCUMENT") === "DOCUMENT"
  );

  const dataRequirements = requiredDocuments.filter(
    (item) => item.kind === "DATA"
  );

  function resetCustomerSelection() {
    setSelectedCustomer(null);
    setSearch("");
    setResults([]);
    setCustomer(emptyCustomer);
  }

  function changeCustomerCategory(value: CustomerCategory) {
    setCustomerCategory(value);
    resetCustomerSelection();
    setProposedCompanyName("");
    setDocuments([]);
    setUploadedFiles({});
    setError("");
    setSuccess("");
  }

  async function searchCustomers(value: string) {
    setSearch(value);
    setSelectedCustomer(null);
    setCustomer(emptyCustomer);
    setError("");

    if (value.trim().length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);

    try {
      const response = await fetch(
        `/api/customers/search?q=${encodeURIComponent(value.trim())}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "تعذر البحث عن العملاء");
      }

      setResults(data.customers || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء البحث عن العميل"
      );
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function chooseCustomer(item: Customer) {
    setSelectedCustomer(item);
    setSearch(item.name);
    setResults([]);

    setCustomer({
      name: item.name,
      phone: item.phone || "",
      email: item.email || "",
      address: item.address || "",
      taxNumber: item.taxNumber || "",
      notes: item.notes || "",
    });
  }

  function updateCustomer(field: keyof typeof emptyCustomer, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  function addDocument() {
    setDocuments((current) => [
      ...current,
      {
        documentType: "",
        documentNumber: "",
        expiryDate: "",
        notes: "",
      },
    ]);
  }

  function updateDocument(
    index: number,
    field: keyof AddedDocument,
    value: string
  ) {
    setDocuments((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  }

  function removeDocument(index: number) {
    setDocuments((current) => current.filter((_, i) => i !== index));
  }

  function updateUploadedFile(requirementId: string, file?: File) {
    setUploadedFiles((current) => {
      const updated = { ...current };

      if (file) {
        updated[requirementId] = file;
      } else {
        delete updated[requirementId];
      }

      return updated;
    });
  }

  function updateQuestionAnswer(code: string, value: string) {
    setQuestionAnswers((current) => ({
      ...current,
      [code]: value,
    }));
  }

  function renderQuestion(question: ServiceQuestion) {
    const value = questionAnswers[question.code] || "";
    const options =
      question.type === "YES_NO"
        ? ["نعم", "لا"]
        : parseQuestionOptions(question.optionsJson);

    return (
      <div className="form-field" key={question.id}>
        <label htmlFor={`question-${question.id}`}>
          {question.label}
          {question.isRequired && " *"}
        </label>

        {question.description && <small>{question.description}</small>}

        {question.type === "YES_NO" || question.type === "SELECT" ? (
          <select
            id={`question-${question.id}`}
            value={value}
            required={question.isRequired}
            onChange={(e) =>
              updateQuestionAnswer(question.code, e.target.value)
            }
          >
            <option value="">اختر الإجابة</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : question.type === "TEXT" ? (
          <input
            id={`question-${question.id}`}
            value={value}
            required={question.isRequired}
            onChange={(e) =>
              updateQuestionAnswer(question.code, e.target.value)
            }
            placeholder="اكتب الإجابة"
          />
        ) : (
          <input
            id={`question-${question.id}`}
            type={
              question.type === "NUMBER"
                ? "number"
                : question.type === "DATE"
                  ? "date"
                  : "text"
            }
            value={value}
            required={question.isRequired}
            onChange={(e) =>
              updateQuestionAnswer(question.code, e.target.value)
            }
          />
        )}
      </div>
    );
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (customerCategory === "EXISTING" && !selectedCustomer) {
      setError("ابحث عن العميل الحالي واختره أولاً.");
      return;
    }

    if (!customer.name.trim()) {
      setError("اسم العميل أو الشركة مطلوب.");
      return;
    }

    if (
      customerCategory === "NEW_UNESTABLISHED" &&
      !proposedCompanyName.trim()
    ) {
      setError("اكتب اسم الشركة المقترح.");
      return;
    }

    if (!serviceId) {
      setError("اختر الخدمة المطلوبة.");
      return;
    }

    if (selectedService?.variants.length && !serviceVariantId) {
      setError("اختر نوع الشركة أو نوع الخدمة.");
      return;
    }

    const unansweredQuestion = serviceQuestions.find(
      (question) =>
        question.isRequired && !questionAnswers[question.code]?.trim()
    );

    if (unansweredQuestion) {
      setError(`أجب عن السؤال: ${unansweredQuestion.label}`);
      return;
    }

    const emptyDataRequirement = dataRequirements.find(
      (item) => item.isRequired && !dataValues[item.id]?.trim()
    );

    if (emptyDataRequirement) {
      setError(`أدخل البيانات المطلوبة: ${emptyDataRequirement.title}`);
      return;
    }

    if (documents.some((item) => !item.documentType.trim())) {
      setError("اختر نوع كل مستند إضافي أو احذف السطر غير المكتمل.");
      return;
    }

    for (const [requirementId, file] of Object.entries(uploadedFiles)) {
      const requirement = documentRequirements.find(
        (item) => item.id === requirementId
      );

      // تجاهل الملفات التي لم تعد متطلبة بعد تغيير إجابة سؤال.
      if (!requirement) continue;

      if (file.size > 10 * 1024 * 1024) {
        setError(
          `حجم ملف "${requirement.title || file.name}" أكبر من 10 ميجابايت.`
        );
        return;
      }

      if (
        !["application/pdf", "image/jpeg", "image/png"].includes(file.type)
      ) {
        setError(`نوع الملف "${file.name}" غير مدعوم. ارفع PDF أو JPG أو PNG.`);
        return;
      }
    }

    setSaving(true);

    try {
      const formData = new FormData();

      const questionAnswersPayload = serviceQuestions
        .filter((question) => questionAnswers[question.code]?.trim())
        .map((question) => ({
          questionId: question.id,
          questionCode: question.code,
          questionLabel: question.label,
          answer: questionAnswers[question.code],
        }));

      const documentDataPayload = dataRequirements
        .filter((item) => dataValues[item.id]?.trim())
        .map((item) => ({
          requirementId: item.id,
          code: item.code,
          title: item.title,
          value: dataValues[item.id],
        }));

      const payload = {
        customerType: customerCategory === "EXISTING" ? "EXISTING" : "NEW",
        customerCategory,
        customerId: selectedCustomer?.id,
        customerName: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        taxNumber: customer.taxNumber,
        customerNotes: customer.notes,
        proposedCompanyName:
          customerCategory === "NEW_UNESTABLISHED"
            ? proposedCompanyName
            : "",
        companyAlreadyEstablished:
          customerCategory !== "NEW_UNESTABLISHED",
        serviceId,
        serviceVariantId: serviceVariantId || null,
        description: request.description,
        priority: request.priority,
        customerDocuments: documents,
        questionAnswers: questionAnswersPayload,
        documentData: documentDataPayload,
      };

      formData.append("payload", JSON.stringify(payload));

      Object.entries(uploadedFiles).forEach(([requirementId, file]) => {
        if (documentRequirements.some((item) => item.id === requirementId)) {
          formData.append(`document:${requirementId}`, file);
        }
      });

      const response = await fetch("/api/requests", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر حفظ الطلب");
      }

      setSuccess(
        `تم تسجيل الطلب بنجاح. رقم الطلب: ${data.request.requestNumber}`
      );

      setCustomerCategory("NEW_UNESTABLISHED");
      resetCustomerSelection();
      setProposedCompanyName("");
      setServiceId("");
      setServiceVariantId("");
      setQuestionAnswers({});
      setDataValues({});
      setRequest({ description: "", priority: "NORMAL" });
      setDocuments([]);
      setUploadedFiles({});
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء حفظ الطلب"
      );
    } finally {
      setSaving(false);
    }
  }

  const isNewCustomer = customerCategory !== "EXISTING";
  const isUnestablished = customerCategory === "NEW_UNESTABLISHED";

  return (
    <form className="form-card" onSubmit={submitRequest}>
      <h2>تسجيل طلب جديد</h2>
      <p>ابدأ بتحديد حالة العميل حتى نعرض البيانات والمستندات المناسبة.</p>

      <div className="form-grid">
        <div className="form-field full-width">
          <label htmlFor="customerCategory">نوع العميل</label>
          <select
            id="customerCategory"
            value={customerCategory}
            onChange={(e) =>
              changeCustomerCategory(e.target.value as CustomerCategory)
            }
          >
            <option value="NEW_UNESTABLISHED">
              عميل جديد – شركة تحت التأسيس
            </option>
            <option value="NEW_ESTABLISHED">
              عميل جديد – شركة متأسسة بالفعل
            </option>
            <option value="EXISTING">
              عميل حالي – لديه ملف سابق
            </option>
          </select>
          <small>{categoryLabels[customerCategory]}</small>
        </div>

        {customerCategory === "EXISTING" && (
          <div className="form-field full-width">
            <label htmlFor="customerSearch">
              ابحث باسم الشركة أو رقم الهاتف أو الرقم الضريبي
            </label>
            <input
              id="customerSearch"
              value={search}
              onChange={(e) => searchCustomers(e.target.value)}
              placeholder="اكتب اسم الشركة أو رقم الهاتف أو الرقم الضريبي..."
            />

            {searching && <p>جاري البحث...</p>}

            {results.length > 0 && (
              <div className="customer-search-results">
                {results.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => chooseCustomer(item)}
                    className="customer-result"
                  >
                    <strong>{item.name}</strong>
                    <span>
                      {item.taxNumber || "لا يوجد رقم ضريبي"} —{" "}
                      {item.phone || "لا يوجد هاتف"}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {search.trim().length >= 2 &&
              !searching &&
              results.length === 0 &&
              !selectedCustomer && <p>لم يتم العثور على عميل مطابق.</p>}
          </div>
        )}
      </div>

      {selectedCustomer && (
        <section style={{ marginTop: 24 }}>
          <h3>ملف العميل المحفوظ</h3>
          <p>تم تحميل بيانات الشركة ومستنداتها المسجلة.</p>

          {selectedCustomer.documents.length === 0 ? (
            <p>لا توجد مستندات محفوظة لهذا العميل حتى الآن.</p>
          ) : (
            <div className="form-grid">
              {selectedCustomer.documents.map((document) => (
                <div className="form-field" key={document.id}>
                  <strong>{document.documentType}</strong>
                  <span>
                    رقم المستند: {document.documentNumber || "غير مسجل"}
                  </span>
                  <span>
                    تاريخ الانتهاء:{" "}
                    {document.expiryDate
                      ? new Date(document.expiryDate).toLocaleDateString(
                          "ar-EG"
                        )
                      : "غير محدد"}
                  </span>
                  <span>
                    {document.filePath
                      ? "يوجد ملف محفوظ لهذا المستند"
                      : "لا يوجد ملف مرفق"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {(isNewCustomer || selectedCustomer) && (
        <>
          <h3 style={{ marginTop: 28 }}>بيانات الشركة والعميل</h3>

          <div className="form-grid">
            {(
              [
                ["name", "اسم الشركة / العميل"],
                ["phone", "رقم الهاتف"],
                ["email", "البريد الإلكتروني"],
                ["address", "العنوان"],
                ["taxNumber", "الرقم الضريبي"],
              ] as const
            ).map(([field, label]) => (
              <div className="form-field" key={field}>
                <label>{label}</label>
                <input
                  required={field === "name"}
                  value={customer[field]}
                  onChange={(e) => updateCustomer(field, e.target.value)}
                  placeholder={`أدخل ${label}`}
                />
              </div>
            ))}

            <div className="form-field full-width">
              <label>ملاحظات عن العميل</label>
              <textarea
                rows={3}
                value={customer.notes}
                onChange={(e) => updateCustomer("notes", e.target.value)}
              />
            </div>
          </div>

          {isUnestablished && (
            <div className="form-field" style={{ marginTop: 20 }}>
              <label htmlFor="proposedCompanyName">اسم الشركة المقترح</label>
              <input
                id="proposedCompanyName"
                required
                value={proposedCompanyName}
                onChange={(e) => setProposedCompanyName(e.target.value)}
                placeholder="اكتب الاسم المقترح للشركة"
              />
            </div>
          )}

          <h3 style={{ marginTop: 28 }}>مستندات العميل الإضافية</h3>
          <p>يمكنك إضافة بيانات مستندات أخرى مرتبطة بملف العميل.</p>

          {documents.map((document, index) => (
            <div className="form-grid" key={index}>
              <div className="form-field">
                <label>نوع المستند</label>
                <select
                  value={document.documentType}
                  onChange={(e) =>
                    updateDocument(index, "documentType", e.target.value)
                  }
                >
                  <option value="">اختر نوع المستند</option>
                  {documentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>رقم المستند</label>
                <input
                  value={document.documentNumber}
                  onChange={(e) =>
                    updateDocument(index, "documentNumber", e.target.value)
                  }
                />
              </div>

              <div className="form-field">
                <label>تاريخ الانتهاء</label>
                <input
                  type="date"
                  value={document.expiryDate}
                  onChange={(e) =>
                    updateDocument(index, "expiryDate", e.target.value)
                  }
                />
              </div>

              <div className="form-field">
                <label>ملاحظات</label>
                <input
                  value={document.notes}
                  onChange={(e) =>
                    updateDocument(index, "notes", e.target.value)
                  }
                />
              </div>

              <div className="form-field">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => removeDocument(index)}
                >
                  حذف المستند
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="secondary-button"
            onClick={addDocument}
          >
            + إضافة مستند للعميل
          </button>
        </>
      )}

      <hr style={{ margin: "28px 0" }} />

      <h2>بيانات الخدمة والطلب</h2>

      <div className="form-grid">
        <div className="form-field">
          <label>الخدمة المطلوبة</label>
          <select
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setServiceVariantId("");
              setQuestionAnswers({});
              setDataValues({});
              setUploadedFiles({});
            }}
            disabled={servicesLoading}
          >
            <option value="">
              {servicesLoading ? "جاري تحميل الخدمات..." : "اختر الخدمة"}
            </option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.category.name} — {service.name}
              </option>
            ))}
          </select>
        </div>

        {selectedService && selectedService.variants.length > 0 && (
          <div className="form-field">
            <label>نوع الشركة / الخدمة</label>
            <select
              value={serviceVariantId}
              onChange={(e) => {
                setServiceVariantId(e.target.value);
                setDataValues({});
                setUploadedFiles({});
              }}
            >
              <option value="">اختر النوع</option>
              {selectedService.variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-field">
          <label>الأولوية</label>
          <select
            value={request.priority}
            onChange={(e) =>
              setRequest((current) => ({
                ...current,
                priority: e.target.value,
              }))
            }
          >
            <option value="NORMAL">عادي</option>
            <option value="MEDIUM">متوسط</option>
            <option value="URGENT">عاجل</option>
          </select>
        </div>

        <div className="form-field full-width">
          <label>وصف الطلب</label>
          <textarea
            rows={4}
            value={request.description}
            onChange={(e) =>
              setRequest((current) => ({
                ...current,
                description: e.target.value,
              }))
            }
            placeholder="اكتب تفاصيل الخدمة أو أي ملاحظات إضافية..."
          />
        </div>
      </div>

      {selectedService && (
        <section style={{ marginTop: 28 }}>
          <h3>أسئلة تحديد متطلبات الخدمة</h3>
          <p>
            أجب عن الأسئلة التالية حتى نحدد المستندات والبيانات المطلوبة لهذه
            الحالة.
          </p>

          {serviceQuestions.length === 0 ? (
            <p>لا توجد أسئلة إضافية مسجلة لهذه الخدمة.</p>
          ) : (
            <div className="form-grid">
              {serviceQuestions.map(renderQuestion)}
            </div>
          )}
        </section>
      )}

      {selectedService && (
        <section style={{ marginTop: 28 }}>
          <h3>البيانات المطلوبة</h3>
          <p>تظهر هذه البيانات وفقًا لنوع الخدمة وإجاباتك.</p>

          {dataRequirements.length === 0 ? (
            <p>لا توجد بيانات إضافية مطلوبة وفقًا للإجابات الحالية.</p>
          ) : (
            <div className="form-grid">
              {dataRequirements.map((item) => (
                <div className="form-field" key={item.id}>
                  <label htmlFor={`data-${item.id}`}>
                    {item.title}
                    {item.isRequired && " *"}
                  </label>
                  {item.details && <small>{item.details}</small>}
                  <input
                    id={`data-${item.id}`}
                    value={dataValues[item.id] || ""}
                    required={item.isRequired}
                    onChange={(e) =>
                      setDataValues((current) => ({
                        ...current,
                        [item.id]: e.target.value,
                      }))
                    }
                    placeholder={`أدخل ${item.title}`}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {selectedService && (
        <section style={{ marginTop: 28 }}>
          <h3>المستندات المطلوبة للخدمة</h3>
          <p>
            تتغير قائمة المستندات تلقائيًا حسب نوع الشركة وإجابات الأسئلة
            السابقة.
          </p>

          {documentRequirements.length === 0 ? (
            <p>لا توجد مستندات مطلوبة وفقًا للاختيارات الحالية.</p>
          ) : (
            <div className="form-grid">
              {documentRequirements.map((document) => {
                const selectedFile = uploadedFiles[document.id];

                return (
                  <div className="form-field" key={document.id}>
                    <strong>{document.title}</strong>

                    <span>
                      {document.isRequired
                        ? "مستند إلزامي"
                        : "مستند اختياري"}
                    </span>

                    {document.details && <span>{document.details}</span>}

                    {document.condition && (
                      <span>الحالة: {document.condition}</span>
                    )}

                    <label htmlFor={`document-${document.id}`}>
                      إرفاق المستند (PDF أو صورة)
                    </label>

                    <input
                      id={`document-${document.id}`}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={(e) =>
                        updateUploadedFile(
                          document.id,
                          e.target.files?.[0]
                        )
                      }
                    />

                    {selectedFile && (
                      <div style={{ marginTop: 6 }}>
                        <span>الملف المختار: {selectedFile.name}</span>
                        <span>{formatFileSize(selectedFile.size)}</span>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => updateUploadedFile(document.id)}
                        >
                          إزالة الملف
                        </button>
                      </div>
                    )}

                    {!selectedFile && document.isRequired && (
                      <small>
                        لم يتم إرفاق هذا المستند بعد. يمكن استكمال النواقص
                        أثناء المراجعة.
                      </small>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {error && (
        <p role="alert" style={{ color: "#b91c1c", marginTop: 20 }}>
          {error}
        </p>
      )}

      {success && (
        <p style={{ color: "#15803d", marginTop: 20 }}>{success}</p>
      )}

      <div style={{ marginTop: 24 }}>
        <button
          type="submit"
          className="primary-button"
          disabled={saving || servicesLoading}
        >
          {saving
            ? "جاري حفظ الطلب والمرفقات..."
            : "حفظ الطلب وإرساله للمراجعة"}
        </button>
      </div>

      <p style={{ marginTop: 16, color: "#64748b" }}>
        بعد الحفظ سيصل الطلب إلى مدير إدارة الإجراءات للمراجعة. ويمكنه مراجعة
        المستندات وتحديد أي نواقص.
      </p>
    </form>
  );
}
