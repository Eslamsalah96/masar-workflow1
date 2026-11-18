
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile, rm } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const ALLOWED_ROLES = [
  "GENERAL_MANAGER",
  "SECRETARY",
  "CUSTOMER_SERVICE",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

type CustomerCategory =
  | "NEW_UNESTABLISHED"
  | "NEW_ESTABLISHED"
  | "EXISTING";

type Payload = {
  customerType: "NEW" | "EXISTING";
  customerCategory?: CustomerCategory;
  customerId?: string;
  customerName: string;
  phone?: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  customerNotes?: string;
  proposedCompanyName?: string;
  companyAlreadyEstablished: boolean;
  serviceId: string;
  serviceVariantId?: string | null;
  description?: string;
  priority?: string;
  customerDocuments?: {
    documentType: string;
    documentNumber?: string;
    expiryDate?: string;
    notes?: string;
  }[];
  questionAnswers?: {
    questionId?: string;
    questionCode: string;
    answer: string;
  }[];
  documentData?: {
    requirementId: string;
    value: string;
  }[];
};

type SubmittedFile = {
  requirementId: string;
  file: File;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getApplicability(payload: Payload): string {
  if (payload.customerType === "EXISTING") return "EXISTING";

  return payload.companyAlreadyEstablished
    ? "NEW_ESTABLISHED"
    : "NEW_UNESTABLISHED";
}

function parseAllowedOptions(optionsJson: string | null): string[] {
  if (!optionsJson) return [];

  try {
    const parsed = JSON.parse(optionsJson);

    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item) => {
      if (typeof item === "string") return [item];

      if (item && typeof item === "object") {
        const values = [
          typeof item.label === "string" ? item.label : "",
          typeof item.value === "string" ? item.value : "",
        ];

        return values.filter(Boolean);
      }

      return [];
    });
  } catch {
    return [];
  }
}

function requirementMatchesAnswers(
  requirement: {
    conditions: {
      expectedValue: string;
      groupKey: string;
      question: { code: string };
    }[];
  },
  answers: Record<string, string>
): boolean {
  const conditions = requirement.conditions || [];

  if (conditions.length === 0) return true;

  const groups = new Map<string, typeof conditions>();

  for (const condition of conditions) {
    const key = condition.groupKey || "DEFAULT";
    const current = groups.get(key) || [];

    current.push(condition);
    groups.set(key, current);
  }

  return Array.from(groups.values()).some((group) =>
    group.every(
      (condition) =>
        answers[condition.question.code] === condition.expectedValue
    )
  );
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    let accessFilter = {};

    if (user.role === "GENERAL_MANAGER") {
      accessFilter = {};
    } else if (user.role === "DEPARTMENT_MANAGER") {
      if (!user.departmentId) {
        return NextResponse.json(
          { error: "المستخدم غير مرتبط بقسم" },
          { status: 403 }
        );
      }

      accessFilter = {
        currentDepartmentId: user.departmentId,
      };
    } else if (user.role === "EMPLOYEE") {
      accessFilter = {
        tasks: {
          some: {
            assignedToId: user.id,
          },
        },
      };
    } else if (
      user.role === "SECRETARY" ||
      user.role === "CUSTOMER_SERVICE"
    ) {
      accessFilter = {
        createdById: user.id,
      };
    } else {
      return NextResponse.json(
        { error: "ليس لديك صلاحية عرض قائمة الطلبات" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("q")?.trim() || "";
    const status = searchParams.get("status") || "";

    const requests = await prisma.request.findMany({
      where: {
        ...accessFilter,
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { requestNumber: { contains: search } },
                { serviceName: { contains: search } },
                {
                  customer: {
                    name: { contains: search },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        customer: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        currentDepartment: true,
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Get requests API error:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء تحميل الطلبات" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let createdRequestId: string | null = null;
  let createdCustomerId: string | null = null;

  const savedFiles: string[] = [];

  try {
    const user = await getCurrentUser();

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية تسجيل الطلبات" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const payloadValue = formData.get("payload");

    if (typeof payloadValue !== "string") {
      return NextResponse.json(
        { error: "بيانات الطلب غير مكتملة" },
        { status: 400 }
      );
    }

    let payload: Payload;

    try {
      payload = JSON.parse(payloadValue) as Payload;
    } catch {
      return NextResponse.json(
        { error: "صيغة بيانات الطلب غير صحيحة" },
        { status: 400 }
      );
    }

    const {
      customerType,
      customerId,
      customerName,
      phone,
      email,
      address,
      taxNumber,
      customerNotes,
      proposedCompanyName,
      companyAlreadyEstablished,
      serviceId,
      serviceVariantId,
      description,
      priority,
      customerDocuments = [],
      questionAnswers = [],
      documentData = [],
    } = payload;

    if (!["NEW", "EXISTING"].includes(customerType)) {
      return NextResponse.json(
        { error: "نوع العميل غير صحيح" },
        { status: 400 }
      );
    }

    if (!clean(customerName)) {
      return NextResponse.json(
        { error: "اسم العميل أو الشركة مطلوب" },
        { status: 400 }
      );
    }

    if (!serviceId) {
      return NextResponse.json(
        { error: "يجب اختيار الخدمة" },
        { status: 400 }
      );
    }

    if (
      customerType === "NEW" &&
      !companyAlreadyEstablished &&
      !clean(proposedCompanyName)
    ) {
      return NextResponse.json(
        { error: "اسم الشركة المقترح مطلوب" },
        { status: 400 }
      );
    }

    if (customerType === "EXISTING" && !customerId) {
      return NextResponse.json(
        { error: "يجب البحث عن عميل حالي واختياره" },
        { status: 400 }
      );
    }

    if (
      payload.customerCategory &&
      ![
        "NEW_UNESTABLISHED",
        "NEW_ESTABLISHED",
        "EXISTING",
      ].includes(payload.customerCategory)
    ) {
      return NextResponse.json(
        { error: "فئة العميل غير صحيحة" },
        { status: 400 }
      );
    }

    if (
      payload.customerCategory === "EXISTING" &&
      customerType !== "EXISTING"
    ) {
      return NextResponse.json(
        { error: "بيانات فئة العميل غير متطابقة" },
        { status: 400 }
      );
    }

    const applicability = getApplicability(payload);

    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        isActive: true,
      },
      include: {
        questions: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
        variants: {
          where: { isActive: true },
        },
        documentRequirements: {
          where: {
            isActive: true,
            variantId: null,
          },
          orderBy: { sortOrder: "asc" },
          include: {
            conditions: {
              include: {
                question: true,
              },
            },
          },
        },
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: "الخدمة المختارة غير موجودة أو غير نشطة" },
        { status: 404 }
      );
    }

    if (service.variants.length > 0 && !serviceVariantId) {
      return NextResponse.json(
        { error: "يجب اختيار نوع الشركة أو الخدمة" },
        { status: 400 }
      );
    }

    let selectedVariant: (typeof service.variants)[number] | null = null;
    let variantRequirements: typeof service.documentRequirements = [];

    if (serviceVariantId) {
      selectedVariant =
        service.variants.find((item) => item.id === serviceVariantId) || null;

      if (!selectedVariant) {
        return NextResponse.json(
          { error: "نوع الخدمة المختار غير صحيح" },
          { status: 400 }
        );
      }

      const variant = await prisma.serviceVariant.findFirst({
        where: {
          id: serviceVariantId,
          serviceId: service.id,
          isActive: true,
        },
        include: {
          documentRequirements: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            include: {
              conditions: {
                include: {
                  question: true,
                },
              },
            },
          },
        },
      });

      if (!variant) {
        return NextResponse.json(
          { error: "نوع الخدمة المختار غير صحيح" },
          { status: 400 }
        );
      }

      variantRequirements = variant.documentRequirements;
    }

    const proceduresDepartment = await prisma.department.findUnique({
      where: { name: "الإجراءات" },
    });

    if (!proceduresDepartment) {
      return NextResponse.json(
        { error: "قسم الإجراءات غير موجود في قاعدة البيانات" },
        { status: 500 }
      );
    }

    const answersByCode: Record<string, string> = {};

    const normalizedAnswers: {
      questionId: string;
      questionCode: string;
      questionLabel: string;
      answer: string;
    }[] = [];

    for (const submittedAnswer of questionAnswers) {
      const code = clean(submittedAnswer.questionCode);
      const answer = clean(submittedAnswer.answer);

      if (!code || !answer) continue;

      const question = service.questions.find(
        (item) => item.code === code
      );

      if (!question) {
        return NextResponse.json(
          { error: `السؤال "${code}" غير تابع للخدمة المختارة` },
          { status: 400 }
        );
      }

      if (
        submittedAnswer.questionId &&
        submittedAnswer.questionId !== question.id
      ) {
        return NextResponse.json(
          { error: "بيانات أحد الأسئلة غير صحيحة" },
          { status: 400 }
        );
      }

      if (
        question.type === "YES_NO" &&
        !["نعم", "لا"].includes(answer)
      ) {
        return NextResponse.json(
          { error: `الإجابة عن السؤال "${question.label}" غير صحيحة` },
          { status: 400 }
        );
      }

      if (question.type === "SELECT") {
        const allowedOptions = parseAllowedOptions(question.optionsJson);

        if (!allowedOptions.includes(answer)) {
          return NextResponse.json(
            { error: `اختر إجابة صحيحة للسؤال "${question.label}"` },
            { status: 400 }
          );
        }
      }

      if (answersByCode[code]) {
        return NextResponse.json(
          { error: `تم إرسال إجابة مكررة للسؤال "${question.label}"` },
          { status: 400 }
        );
      }

      answersByCode[code] = answer;

      normalizedAnswers.push({
        questionId: question.id,
        questionCode: question.code,
        questionLabel: question.label,
        answer,
      });
    }

    const unansweredQuestion = service.questions.find(
      (question) =>
        question.isRequired && !answersByCode[question.code]
    );

    if (unansweredQuestion) {
      return NextResponse.json(
        { error: `يجب الإجابة عن السؤال: ${unansweredQuestion.label}` },
        { status: 400 }
      );
    }

    const allRequirements = [
      ...service.documentRequirements,
      ...variantRequirements,
    ];

    const uniqueRequirements = new Map<
      string,
      (typeof allRequirements)[number]
    >();

    for (const item of allRequirements) {
      if (
        item.applicability !== "ALL" &&
        item.applicability !== applicability
      ) {
        continue;
      }

      if (!requirementMatchesAnswers(item, answersByCode)) {
        continue;
      }

      uniqueRequirements.set(item.id, item);
    }

    const requirements = Array.from(uniqueRequirements.values());

    const submittedData = new Map<string, string>();

    for (const item of documentData) {
      const requirementId = clean(item.requirementId);
      const value = clean(item.value);

      if (!requirementId) continue;

      const requirement = requirements.find(
        (entry) => entry.id === requirementId
      );

      if (!requirement || requirement.kind !== "DATA") {
        return NextResponse.json(
          { error: "تم إرسال بيانات لمتطلب غير تابع للخدمة المختارة" },
          { status: 400 }
        );
      }

      if (submittedData.has(requirementId)) {
        return NextResponse.json(
          { error: `تم إرسال بيانات مكررة للمتطلب "${requirement.title}"` },
          { status: 400 }
        );
      }

      if (value) {
        submittedData.set(requirementId, value);
      }
    }

    const missingDataRequirement = requirements.find(
      (item) =>
        item.kind === "DATA" &&
        item.isRequired &&
        !submittedData.has(item.id)
    );

    if (missingDataRequirement) {
      return NextResponse.json(
        { error: `يجب إدخال البيانات: ${missingDataRequirement.title}` },
        { status: 400 }
      );
    }

    const submittedFiles: SubmittedFile[] = [];

    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("document:")) continue;
      if (!(value instanceof File) || value.size === 0) continue;

      const requirementId = key.slice("document:".length);

      const requirement = requirements.find(
        (item) =>
          item.id === requirementId &&
          item.kind === "DOCUMENT"
      );

      if (!requirement) {
        return NextResponse.json(
          { error: "تم إرسال ملف لمستند غير مطلوب في هذه الحالة" },
          { status: 400 }
        );
      }

      if (value.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `حجم الملف "${requirement.title}" أكبر من 10 ميجابايت` },
          { status: 400 }
        );
      }

      if (!ALLOWED_MIME_TYPES[value.type]) {
        return NextResponse.json(
          {
            error: `نوع الملف "${requirement.title}" غير مدعوم. ارفع PDF أو JPG أو PNG`,
          },
          { status: 400 }
        );
      }

      if (
        submittedFiles.some(
          (item) => item.requirementId === requirementId
        )
      ) {
        return NextResponse.json(
          { error: `تم إرسال أكثر من ملف للمتطلب "${requirement.title}"` },
          { status: 400 }
        );
      }

      submittedFiles.push({
        requirementId,
        file: value,
      });
    }

    for (const document of customerDocuments) {
      if (!clean(document.documentType)) {
        return NextResponse.json(
          { error: "يوجد مستند إضافي بدون نوع محدد" },
          { status: 400 }
        );
      }

      if (
        document.expiryDate &&
        Number.isNaN(Date.parse(document.expiryDate))
      ) {
        return NextResponse.json(
          { error: "تاريخ انتهاء أحد المستندات غير صحيح" },
          { status: 400 }
        );
      }
    }

    let existingCustomer = null;

    if (customerType === "EXISTING") {
      existingCustomer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!existingCustomer) {
        return NextResponse.json(
          { error: "العميل المختار غير موجود" },
          { status: 404 }
        );
      }
    }

    if (customerType === "NEW") {
      const duplicate = await prisma.customer.findFirst({
        where: clean(taxNumber)
          ? { taxNumber: clean(taxNumber) }
          : { name: clean(customerName) },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            error:
              "يوجد عميل مسجل بهذه البيانات بالفعل. اختر «عميل حالي» وابحث عنه بدل إنشاء سجل مكرر.",
          },
          { status: 409 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      let customer;

      if (customerType === "EXISTING") {
        // تحديث الحقول المرسلة فقط، والحفاظ على أي بيانات قديمة
        // عندما تكون الخانة فارغة في الطلب الجديد.
        const customerUpdateData: {
          name?: string;
          phone?: string;
          email?: string;
          address?: string;
          taxNumber?: string;
          notes?: string;
        } = {};

        const newName = clean(customerName);
        const newPhone = clean(phone);
        const newEmail = clean(email);
        const newAddress = clean(address);
        const newTaxNumber = clean(taxNumber);
        const newNotes = clean(customerNotes);

        if (newName) customerUpdateData.name = newName;
        if (newPhone) customerUpdateData.phone = newPhone;
        if (newEmail) customerUpdateData.email = newEmail;
        if (newAddress) customerUpdateData.address = newAddress;
        if (newTaxNumber) customerUpdateData.taxNumber = newTaxNumber;
        if (newNotes) customerUpdateData.notes = newNotes;

        customer = await tx.customer.update({
          where: { id: customerId },
          data: customerUpdateData,
        });
      } else {
        customer = await tx.customer.create({
          data: {
            name: clean(customerName),
            phone: clean(phone) || null,
            email: clean(email) || null,
            address: clean(address) || null,
            taxNumber: clean(taxNumber) || null,
            notes: clean(customerNotes) || null,
          },
        });

        createdCustomerId = customer.id;
      }

      if (customerDocuments.length > 0) {
        await tx.customerDocument.createMany({
          data: customerDocuments.map((document) => ({
            customerId: customer.id,
            documentType: clean(document.documentType),
            documentNumber: clean(document.documentNumber) || null,
            expiryDate: document.expiryDate
              ? new Date(`${document.expiryDate}T12:00:00`)
              : null,
            notes: clean(document.notes) || null,
          })),
        });
      }

      const requestNumber =
        `MAS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID()
          .slice(0, 8)
          .toUpperCase()}`;

      const newRequest = await tx.request.create({
        data: {
          requestNumber,
          customerId: customer.id,
          createdById: user.id,
          currentDepartmentId: proceduresDepartment.id,
          serviceName: selectedVariant
            ? `${service.name} - ${selectedVariant.name}`
            : service.name,
          serviceId: service.id,
          serviceVariantId: selectedVariant?.id ?? null,
          customerType,
          proposedCompanyName: clean(proposedCompanyName) || null,
          companyAlreadyEstablished: Boolean(companyAlreadyEstablished),
          description: clean(description) || null,
          priority: ["NORMAL", "MEDIUM", "URGENT"].includes(priority || "")
            ? priority!
            : "NORMAL",
          status: "PENDING_REVIEW",
          submittedAt: new Date(),
          questionAnswers: {
            create: normalizedAnswers,
          },
          documentRequirements: {
            create: requirements.map((item) => {
              const dataValue =
                item.kind === "DATA"
                  ? submittedData.get(item.id) || null
                  : null;

              return {
                requirementId: item.id,
                requirementCode: item.code,
                title: item.title,
                details: item.details,
                condition: item.condition,
                isRequired: item.isRequired,
                applicability: item.applicability,
                kind: item.kind,
                value: dataValue,
                status: dataValue ? "RECEIVED" : "NOT_RECEIVED",
                receivedAt: dataValue ? new Date() : null,
                sortOrder: item.sortOrder,
              };
            }),
          },
        },
        include: {
          documentRequirements: true,
          questionAnswers: true,
          customer: true,
          service: true,
          serviceVariant: true,
        },
      });

      await tx.activityLog.create({
        data: {
          requestId: newRequest.id,
          userId: user.id,
          action: "REQUEST_SUBMITTED",
          details:
            "تم تسجيل الطلب وإرسال بياناته ومستنداته إلى مدير إدارة الإجراءات للمراجعة",
        },
      });

      return newRequest;
    });

    createdRequestId = result.id;

    const uploadDirectory = path.join(
      process.cwd(),
      "storage",
      "uploads",
      "requests",
      result.id
    );

    await mkdir(uploadDirectory, { recursive: true });

    for (const { requirementId, file } of submittedFiles) {
      const snapshot = result.documentRequirements.find(
        (item) => item.requirementId === requirementId
      );

      if (!snapshot) continue;

      const extension = ALLOWED_MIME_TYPES[file.type];
      const storedName = `${randomUUID()}${extension}`;
      const absolutePath = path.join(uploadDirectory, storedName);

      const relativePath = path.join(
        "storage",
        "uploads",
        "requests",
        result.id,
        storedName
      );

      const bytes = Buffer.from(await file.arrayBuffer());

      await writeFile(absolutePath, bytes);
      savedFiles.push(absolutePath);

      await prisma.requestDocumentRequirement.update({
        where: { id: snapshot.id },
        data: {
          filePath: relativePath,
          fileName: file.name,
          fileMimeType: file.type,
          fileSize: file.size,
          status: "RECEIVED",
          receivedAt: new Date(),
        },
      });
    }

    const updatedRequest = await prisma.request.findUnique({
      where: { id: result.id },
      include: {
        customer: true,
        documentRequirements: true,
        questionAnswers: true,
        service: true,
        serviceVariant: true,
      },
    });

    return NextResponse.json(
      {
        message: "تم تسجيل الطلب وإرساله للمراجعة بنجاح",
        request: updatedRequest,
      },
      { status: 201 }
    );
  } catch (error) {
    if (createdRequestId) {
      await prisma.request
        .delete({ where: { id: createdRequestId } })
        .catch(() => undefined);

      await rm(
        path.join(
          process.cwd(),
          "storage",
          "uploads",
          "requests",
          createdRequestId
        ),
        { recursive: true, force: true }
      ).catch(() => undefined);
    } else {
      await Promise.all(
        savedFiles.map((file) =>
          rm(file, { force: true }).catch(() => undefined)
        )
      );
    }

    if (createdCustomerId) {
      await prisma.customer
        .delete({ where: { id: createdCustomerId } })
        .catch(() => undefined);
    }

    console.error("Create request API error:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء تسجيل الطلب أو حفظ المرفقات" },
      { status: 500 }
    );
  }
}
