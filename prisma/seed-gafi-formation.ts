
import { prisma } from "../lib/prisma";

const CATEGORY = {
  name: "تأسيس الشركات",
  slug: "company-incorporation",
};

const servicesData = [
  {
    slug: "capital-companies",
    name: "تأسيس شركات الأموال",
    sourcePage: 13,
    sortOrder: 1,
    variants: [
      ["joint-stock", "شركة مساهمة"],
      ["partnership-limited-by-shares", "شركة توصية بالأسهم"],
      ["limited-liability", "شركة ذات مسؤولية محدودة"],
    ],
  },
  {
    slug: "partnership-companies",
    name: "تأسيس شركات الأشخاص",
    sourcePage: 18,
    sortOrder: 2,
    variants: [
      ["general-partnership", "شركة تضامن"],
      ["limited-partnership", "شركة توصية بسيطة"],
    ],
  },
  {
    slug: "sole-proprietorship",
    name: "تأسيس المنشأة الفردية",
    sourcePage: 21,
    sortOrder: 3,
    variants: [["sole-proprietorship", "منشأة فردية"]],
  },
  {
    slug: "one-person-company",
    name: "تأسيس شركة الشخص الواحد",
    sourcePage: 23,
    sortOrder: 4,
    variants: [["one-person-company", "شركة الشخص الواحد"]],
  },
] as const;

const questions = [
  {
    code: "COND-001",
    label: "هل التأسيس عن طريق وكيل؟",
    type: "YES_NO",
    options: ["نعم", "لا"],
    sortOrder: 1,
  },
  {
    code: "COND-002",
    label: "هل يوجد مؤسس أو شريك أجنبي؟",
    type: "YES_NO",
    options: ["نعم", "لا"],
    sortOrder: 2,
  },
  {
    code: "COND-003",
    label: "هل توجد حصة عينية؟",
    type: "YES_NO",
    options: ["نعم", "لا"],
    sortOrder: 3,
  },
  {
    code: "COND-004",
    label: "هل النشاط يتطلب موافقة جهة مختصة؟",
    type: "YES_NO",
    options: ["نعم", "لا"],
    sortOrder: 4,
  },
  {
    code: "COND-005",
    label: "هل التأسيس بنظام المناطق الحرة العامة؟",
    type: "YES_NO",
    options: ["نعم", "لا"],
    sortOrder: 5,
  },
  {
    code: "COND-006",
    label: "ما صفة مؤسس شركة الشخص الواحد؟",
    type: "SELECT",
    options: ["طبيعي", "اعتباري", "من أشخاص القانون العام"],
    sortOrder: 6,
  },
  {
    code: "COND-007",
    label: "هل تأسيس شركة الأشخاص ناتج عن وفاة صاحب منشأة فردية؟",
    type: "YES_NO",
    options: ["نعم", "لا"],
    sortOrder: 7,
  },
  {
    code: "COND-008",
    label: "هل يوجد ورثة قُصّر؟",
    type: "YES_NO",
    options: ["نعم", "لا"],
    sortOrder: 8,
  },
] as const;

type RequirementInput = {
  code: string;
  service: string;
  title: string;
  kind?: string;
  condition?: string;
  note?: string;
  variant?: string;
  question?: string;
  expected?: string;
  page: number;
};

const requirements: RequirementInput[] = [
  // شركات الأموال
  { code: "CAP-001", service: "capital-companies", title: "شهادة عدم التباس الاسم معتمدة من السجل التجاري", page: 13 },
  { code: "CAP-002-JS", service: "capital-companies", title: "شهادة بنكية بإيداع رأس المال", variant: "joint-stock", condition: "تطبق على شركات المساهمة وفق النص. تفاصيل النسب والمواعيد تحتاج مراجعة صورة الصفحة.", note: "أرقام النسب والحدود المالية مشوشة في OCR.", page: 13 },
  { code: "CAP-002-PLS", service: "capital-companies", title: "شهادة بنكية بإيداع رأس المال", variant: "partnership-limited-by-shares", condition: "تطبق على شركات التوصية بالأسهم وفق النص. تفاصيل النسب والمواعيد تحتاج مراجعة صورة الصفحة.", note: "أرقام النسب والحدود المالية مشوشة في OCR.", page: 13 },
  { code: "CAP-003", service: "capital-companies", title: "توكيلات التأسيس", question: "COND-001", expected: "نعم", condition: "عند التأسيس عن طريق وكيل. يراعى النص على صلاحيات التأسيس والتوقيع.", page: 13 },
  { code: "CAP-004", service: "capital-companies", title: "إثبات شخصية المؤسسين أو الشركاء", condition: "رقم قومي للمصريين أو جواز سفر للأجانب.", page: 13 },
  { code: "CAP-005", service: "capital-companies", title: "مستخرج رسمي من سجل المحاسبين والمراجعين", condition: "لمراقب حسابات الشركة لإثبات أحقيته في مراجعة واعتماد الميزانيات.", note: "يلزم تأكيد المستندات البديلة المقبولة.", page: 13 },
  { code: "CAP-006", service: "capital-companies", title: "كارنيه قيد المحامي بنقابة المحامين", condition: "للمحامي الذي يصدق على العقد. الحد المالي المذكور في الصفحة غير واضح.", note: "لا تعتمد الحد المالي قبل مراجعة صورة الصفحة.", page: 13 },
  { code: "CAP-007", service: "capital-companies", title: "نموذج الاستعلام الأمني", question: "COND-002", expected: "نعم", condition: "للمؤسسين أو الشركاء الأجانب.", page: 13 },
  { code: "CAP-008", service: "capital-companies", title: "اسم وعنوان المستشار القانوني للشركة", kind: "DATA", condition: "بيانات المستشار القانوني، على ألا تقل درجة قيده عن محام استئناف.", page: 13 },
  { code: "CAP-009", service: "capital-companies", title: "إثبات شخصية الوكيل", question: "COND-001", expected: "نعم", condition: "عند وجود وكيل. جواز سفر الأجنبي يلزم أن تكون معه إقامة سارية.", page: 13 },
  { code: "CAP-010", service: "capital-companies", title: "موافقة الجهة المختصة", question: "COND-004", expected: "نعم", condition: "إذا كان أي من أغراض الشركة يتطلب موافقة خاصة بموجب القوانين.", page: 13 },
  { code: "CAP-011-JS", service: "capital-companies", title: "تقرير تقييم الحصة العينية", variant: "joint-stock", question: "COND-003", expected: "نعم", condition: "في شركات المساهمة عند وجود حصة عينية.", page: 13 },
  { code: "CAP-011-PLS", service: "capital-companies", title: "تقرير تقييم الحصة العينية", variant: "partnership-limited-by-shares", question: "COND-003", expected: "نعم", condition: "في شركات التوصية بالأسهم عند وجود حصة عينية.", page: 13 },

  // شركات الأشخاص
  { code: "PAR-001", service: "partnership-companies", title: "توكيلات من جميع الشركاء", question: "COND-001", expected: "نعم", condition: "عند التأسيس عن طريق وكيل. يراعى النص على التأسيس والتوقيع.", page: 18 },
  { code: "PAR-002", service: "partnership-companies", title: "إثبات شخصية الشركاء", condition: "رقم قومي للمصريين أو جوازات سفر للأجانب.", page: 18 },
  { code: "PAR-003", service: "partnership-companies", title: "كارنيه قيد المحامي بنقابة المحامين", condition: "للمحامي الذي يصدق على العقد، وفق النص.", page: 18 },
  { code: "PAR-004", service: "partnership-companies", title: "نموذج الاستعلام الأمني", question: "COND-002", expected: "نعم", condition: "للشركاء الأجانب.", page: 18 },
  { code: "PAR-005", service: "partnership-companies", title: "إثبات شخصية الوكيل", question: "COND-001", expected: "نعم", condition: "عند وجود وكيل. جواز سفر الأجنبي يلزم أن تكون معه إقامة سارية.", page: 18 },
  { code: "PAR-006", service: "partnership-companies", title: "موافقة الجهة المختصة", question: "COND-004", expected: "نعم", condition: "إذا كان غرض الشركة يتطلب موافقة خاصة مسبقة.", page: 18 },
  { code: "PAR-007", service: "partnership-companies", title: "تقرير تقييم الحصة العينية", question: "COND-003", expected: "نعم", condition: "عند وجود حصة عينية.", page: 18 },
  { code: "PAR-008", service: "partnership-companies", title: "موافقة الهيئة للعمل بنظام المناطق الحرة العامة", question: "COND-005", expected: "نعم", condition: "عند تأسيس الشركة للعمل بنظام المناطق الحرة العامة.", page: 18 },

  // المنشأة الفردية
  { code: "SOLE-001", service: "sole-proprietorship", title: "توكيل من صاحب المنشأة", question: "COND-001", expected: "نعم", condition: "عند التأسيس عن طريق وكيل.", page: 21 },
  { code: "SOLE-002", service: "sole-proprietorship", title: "إثبات شخصية صاحب المنشأة", condition: "رقم قومي للمصري أو جواز سفر للأجنبي.", page: 21 },
  { code: "SOLE-003", service: "sole-proprietorship", title: "إثبات شخصية الوكيل", question: "COND-001", expected: "نعم", condition: "عند وجود وكيل. جواز سفر الأجنبي يلزم أن تكون معه إقامة سارية.", page: 21 },
  { code: "SOLE-004", service: "sole-proprietorship", title: "نموذج الاستعلام الأمني", question: "COND-002", expected: "نعم", condition: "لصاحب المنشأة الأجنبي.", page: 21 },
  { code: "SOLE-005", service: "sole-proprietorship", title: "موافقة الجهة المختصة", question: "COND-004", expected: "نعم", condition: "إذا كان النشاط يتطلب موافقة خاصة مسبقة.", page: 21 },
  { code: "SOLE-006", service: "sole-proprietorship", title: "تقرير تقييم الحصة العينية", question: "COND-003", expected: "نعم", condition: "عند وجود حصة عينية.", page: 21 },
  { code: "SOLE-007", service: "sole-proprietorship", title: "موافقة الهيئة للعمل بنظام المناطق الحرة العامة", question: "COND-005", expected: "نعم", condition: "عند تأسيس المنشأة للعمل بنظام المناطق الحرة العامة.", page: 21 },

  // شركة الشخص الواحد
  { code: "OPC-001", service: "one-person-company", title: "شهادة عدم التباس الاسم معتمدة من السجل التجاري", page: 23 },
  { code: "OPC-002", service: "one-person-company", title: "شهادة بنكية بإيداع كامل رأس المال", condition: "النص يذكر ألا يقل رأس المال عن ألف جنيه مصري.", note: "يلزم التحقق من استمرار صحة الحد قانونيًا. لا تعتمد الحد المالي دون مراجعة المصدر.", page: 23 },
  { code: "OPC-003", service: "one-person-company", title: "توكيل من الممثل القانوني للشخص الاعتباري", question: "COND-006", expected: "اعتباري", condition: "إذا كان مؤسس الشركة شخصًا اعتباريًا.", page: 23 },
  { code: "OPC-004", service: "one-person-company", title: "سجل حديث للشخص الاعتباري", question: "COND-006", expected: "اعتباري", condition: "إذا كان مؤسس الشركة شخصًا اعتباريًا.", page: 23 },
  { code: "OPC-005", service: "one-person-company", title: "موافقة رئيس مجلس الوزراء أو الوزير المختص", question: "COND-006", expected: "من أشخاص القانون العام", condition: "إذا كان مؤسس الشركة أحد أشخاص القانون العام.", page: 23 },
  { code: "OPC-006", service: "one-person-company", title: "توكيل بتأسيس شركة الشخص الواحد", question: "COND-001", expected: "نعم", condition: "بحسب طريقة التأسيس والتمثيل القانوني.", page: 23 },
  { code: "OPC-007", service: "one-person-company", title: "نموذج الاستعلام الأمني", question: "COND-002", expected: "نعم", condition: "لصاحب الشركة أو المدير الأجنبي.", page: 23 },
  { code: "OPC-008", service: "one-person-company", title: "مستخرج رسمي من سجل المحاسبين والمراجعين", condition: "لمراقب الحسابات لإثبات أحقيته في مراجعة واعتماد الميزانيات.", page: 23 },
  { code: "OPC-009", service: "one-person-company", title: "إثبات شخصية المؤسس", condition: "رقم قومي للمصري أو جواز سفر للأجنبي.", page: 23 },
  { code: "OPC-010", service: "one-person-company", title: "إثبات شخصية الوكيل", question: "COND-001", expected: "نعم", condition: "عند وجود وكيل. جواز سفر الأجنبي يلزم أن تكون معه إقامة سارية.", page: 23 },
  { code: "OPC-011", service: "one-person-company", title: "تقرير تقييم الحصة العينية وإقرار المؤسس", question: "COND-003", expected: "نعم", condition: "عند وجود حصة عينية.", page: 23 },
  { code: "OPC-012", service: "one-person-company", title: "موافقة الهيئة للعمل بنظام المناطق الحرة العامة", question: "COND-005", expected: "نعم", condition: "عند تأسيس الشركة للعمل بنظام المناطق الحرة العامة.", page: 23 },
  { code: "OPC-013", service: "one-person-company", title: "موافقة الجهة المختصة", question: "COND-004", expected: "نعم", condition: "إذا كان النشاط يتطلب موافقة خاصة مسبقة.", page: 23 },
  { code: "OPC-014", service: "one-person-company", title: "كارنيه قيد المحامي بنقابة المحامين", condition: "للمحامي الذي يصدق على العقد، وفق النص.", page: 23 },
  { code: "OPC-015", service: "one-person-company", title: "اسم وعنوان المستشار القانوني", kind: "DATA", condition: "بيانات المستشار القانوني، على ألا تقل درجة قيده عن محام استئناف.", page: 23 },

  // الحالة الخاصة: وفاة صاحب المنشأة الفردية
  { code: "CASE-001", service: "partnership-companies", title: "مستخرج حديث من السجل التجاري للمنشأة الفردية", question: "COND-007", expected: "نعم", condition: "عند تأسيس شركة أشخاص نتيجة وفاة صاحب منشأة فردية.", page: 18 },
  { code: "CASE-002", service: "partnership-companies", title: "شهادة وفاة صاحب المنشأة", question: "COND-007", expected: "نعم", condition: "عند تأسيس شركة أشخاص نتيجة وفاة صاحب منشأة فردية.", page: 18 },
  { code: "CASE-003", service: "partnership-companies", title: "إعلام وراثة متضمنًا ورثة صاحب المنشأة", question: "COND-007", expected: "نعم", condition: "عند تأسيس شركة أشخاص نتيجة وفاة صاحب منشأة فردية.", page: 18 },
  { code: "CASE-004", service: "partnership-companies", title: "موافقة المحكمة على الإذن للقاصر بالدخول في تأسيس الشركة من ماله الموروث", question: "COND-008", expected: "نعم", condition: "عند وجود ورثة قُصّر في حالة وفاة صاحب المنشأة.", page: 18 },
  { code: "CASE-005", service: "partnership-companies", title: "تقرير تقييم الأصول المادية الملموسة للمنشأة", question: "COND-007", expected: "نعم", condition: "عند تأسيس شركة أشخاص نتيجة وفاة صاحب منشأة فردية.", page: 18 },
  { code: "CASE-006", service: "partnership-companies", title: "مستندات مؤيدة لملكية الأصول", question: "COND-007", expected: "نعم", condition: "لتأييد ملكية أصول المنشأة الفردية.", page: 18 },
  { code: "CASE-007", service: "partnership-companies", title: "أصل محضر اجتماع جماعة الشركاء بالموافقة على تقرير التقييم وتوزيعه", question: "COND-007", expected: "نعم", condition: "عند تأسيس شركة أشخاص نتيجة وفاة صاحب منشأة فردية.", page: 18 },
];

async function main() {
  console.log("بدء إدخال كتالوج تأسيس الشركات...");

  const category = await prisma.serviceCategory.upsert({
    where: { slug: CATEGORY.slug },
    update: { name: CATEGORY.name },
    create: CATEGORY,
  });

  const serviceMap = new Map<string, string>();
  const variantMap = new Map<string, string>();

  for (const item of servicesData) {
    const service = await prisma.service.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        sourceName: "GAFI",
        sourcePage: item.sourcePage,
        sortOrder: item.sortOrder,
        isActive: true,
      },
      create: {
        categoryId: category.id,
        name: item.name,
        slug: item.slug,
        sourceName: "GAFI",
        sourcePage: item.sourcePage,
        sortOrder: item.sortOrder,
      },
    });

    serviceMap.set(item.slug, service.id);

    for (let index = 0; index < item.variants.length; index++) {
      const [slug, name] = item.variants[index];

      const variant = await prisma.serviceVariant.upsert({
        where: {
          serviceId_slug: {
            serviceId: service.id,
            slug,
          },
        },
        update: { name, isActive: true, sortOrder: index + 1 },
        create: {
          serviceId: service.id,
          slug,
          name,
          sortOrder: index + 1,
        },
      });

      variantMap.set(`${item.slug}:${slug}`, variant.id);
    }
  }

  // تعطيل المتطلبات القديمة لهذه الخدمات دون حذفها.
  const serviceIds = [...serviceMap.values()];

  await prisma.serviceDocumentRequirement.updateMany({
    where: { serviceId: { in: serviceIds } },
    data: { isActive: false },
  });

  // إنشاء الأسئلة وربطها بالخدمات.
  const questionMap = new Map<string, string>();

  for (const question of questions) {
    const serviceSlug =
      question.code === "COND-007" || question.code === "COND-008"
        ? "partnership-companies"
        : question.code === "COND-006"
          ? "one-person-company"
          : null;

    const applicableServices = serviceSlug
      ? [serviceSlug]
      : question.code === "COND-005"
        ? ["partnership-companies", "sole-proprietorship", "one-person-company"]
        : servicesData.map((service) => service.slug);

    // الأكواد فريدة؛ نسجل نسخة سؤال واحدة لكل خدمة عند الحاجة.
    for (const slug of applicableServices) {
      const code = `${question.code}-${slug}`;

      const saved = await prisma.serviceQuestion.upsert({
        where: { code },
        update: {
          label: question.label,
          type: question.type,
          optionsJson: JSON.stringify(question.options),
          isRequired: true,
          isActive: true,
          sortOrder: question.sortOrder,
        },
        create: {
          code,
          serviceId: serviceMap.get(slug)!,
          label: question.label,
          type: question.type,
          optionsJson: JSON.stringify(question.options),
          isRequired: true,
          sortOrder: question.sortOrder,
        },
      });

      questionMap.set(`${question.code}:${slug}`, saved.id);
    }
  }

  for (const item of requirements) {
    const serviceId = serviceMap.get(item.service)!;
    const variantId = item.variant
      ? variantMap.get(`${item.service}:${item.variant}`)
      : null;

    const saved = await prisma.serviceDocumentRequirement.upsert({
      where: { code: item.code },
      update: {
        serviceId,
        variantId,
        title: item.title,
        details: item.condition ?? null,
        condition: item.condition ?? null,
        sourcePage: item.page,
        sourceNote: item.note ?? "مراجعة أولية - يلزم الاعتماد القانوني",
        kind: item.kind ?? "DOCUMENT",
        isRequired: true,
        isActive: true,
        sortOrder: 0,
        applicability: "ALL",
      },
      create: {
        code: item.code,
        serviceId,
        variantId,
        title: item.title,
        details: item.condition ?? null,
        condition: item.condition ?? null,
        sourcePage: item.page,
        sourceNote: item.note ?? "مراجعة أولية - يلزم الاعتماد القانوني",
        kind: item.kind ?? "DOCUMENT",
        isRequired: true,
        isActive: true,
        sortOrder: 0,
        applicability: "ALL",
      },
    });

    await prisma.serviceRequirementCondition.deleteMany({
      where: { requirementId: saved.id },
    });

    if (item.question && item.expected) {
      const questionId = questionMap.get(`${item.question}:${item.service}`);

      if (!questionId) {
        throw new Error(`السؤال غير موجود: ${item.question} / ${item.service}`);
      }

      await prisma.serviceRequirementCondition.create({
        data: {
          requirementId: saved.id,
          questionId,
          expectedValue: item.expected,
          groupKey: "DEFAULT",
        },
      });
    }
  }

  // تنظيف الأسئلة غير المستخدمة لا يتم هنا حفاظًا على تاريخ الطلبات.

  console.log("تم إدخال كتالوج التأسيس بنجاح.");
  console.log("الخدمات:", servicesData.length);
  console.log("الأسئلة:", questionMap.size);
  console.log("المتطلبات:", requirements.length);
  console.log("حالة البيانات: مراجعة أولية - غير معتمدة قانونيًا");
}

main()
  .catch((error) => {
    console.error("فشل إدخال الكتالوج:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
