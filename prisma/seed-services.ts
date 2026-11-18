
import { prisma } from "../lib/prisma";

async function main() {
  console.log("بدء إضافة خدمات دليل GAFI...");

  // ==========================================
  // 1. إنشاء تصنيف الخدمات
  // ==========================================

  const category = await prisma.serviceCategory.upsert({
    where: {
      slug: "company-incorporation",
    },
    update: {
      name: "تأسيس الشركات",
      description: "خدمات تأسيس الشركات وفق دليل خدمات GAFI",
      isActive: true,
    },
    create: {
      name: "تأسيس الشركات",
      slug: "company-incorporation",
      description: "خدمات تأسيس الشركات وفق دليل خدمات GAFI",
      sortOrder: 1,
    },
  });

  // ==========================================
  // 2. إنشاء الخدمة الرئيسية
  // ==========================================

  const service = await prisma.service.upsert({
    where: {
      slug: "capital-companies",
    },
    update: {
      name: "تأسيس شركات الأموال",
      categoryId: category.id,
      description:
        "تأسيس الشركات المساهمة وشركات التوصية بالأسهم والشركات ذات المسؤولية المحدودة",
      sourceName: "دليل خدمات مركز المستثمرين - GAFI 2026",
      sourcePage: 5,
      isActive: true,
    },
    create: {
      name: "تأسيس شركات الأموال",
      slug: "capital-companies",
      categoryId: category.id,
      description:
        "تأسيس الشركات المساهمة وشركات التوصية بالأسهم والشركات ذات المسؤولية المحدودة",
      sourceName: "دليل خدمات مركز المستثمرين - GAFI 2026",
      sourcePage: 5,
      sortOrder: 1,
    },
  });

  // ==========================================
  // 3. أنواع الشركات
  // ==========================================

  const variantData = [
    {
      name: "شركة مساهمة",
      slug: "joint-stock",
      description: "تأسيس شركة مساهمة",
      sortOrder: 1,
    },
    {
      name: "شركة توصية بالأسهم",
      slug: "partnership-limited-by-shares",
      description: "تأسيس شركة توصية بالأسهم",
      sortOrder: 2,
    },
    {
      name: "شركة ذات مسؤولية محدودة",
      slug: "limited-liability",
      description: "تأسيس شركة ذات مسؤولية محدودة",
      sortOrder: 3,
    },
  ];

  const variants: Record<string, string> = {};

  for (const item of variantData) {
    const variant = await prisma.serviceVariant.upsert({
      where: {
        serviceId_slug: {
          serviceId: service.id,
          slug: item.slug,
        },
      },
      update: {
        name: item.name,
        description: item.description,
        isActive: true,
        sortOrder: item.sortOrder,
      },
      create: {
        serviceId: service.id,
        name: item.name,
        slug: item.slug,
        description: item.description,
        sortOrder: item.sortOrder,
      },
    });

    variants[item.slug] = variant.id;
  }

  // ==========================================
  // 4. المستندات المطلوبة
  // ==========================================

  const requirements = [
    {
      code: "CAPITAL-COMPANY-NAME-CERTIFICATE",
      title: "شهادة عدم التباس الاسم",
      details: "شهادة معتمدة من السجل التجاري.",
      condition: null,
      variantSlug: null,
      isRequired: true,
      sortOrder: 1,
      sourcePage: 5,
    },

    {
      code: "CAPITAL-COMPANY-BANK-JOINT-STOCK",
      title: "الشهادة البنكية بإيداع رأس المال",
      details:
        "إيداع 10% على الأقل من قيمة رأس المال المصدر، مع استكمال النسبة إلى 25% خلال 3 أشهر وإلى 100% خلال 5 سنوات وفق الدليل.",
      condition: "تطبق على الشركة المساهمة.",
      variantSlug: "joint-stock",
      isRequired: true,
      sortOrder: 2,
      sourcePage: 5,
    },

    {
      code: "CAPITAL-COMPANY-BANK-PARTNERSHIP",
      title: "الشهادة البنكية بإيداع رأس المال",
      details:
        "إيداع 10% على الأقل من قيمة رأس المال المصدر، مع استكمال النسبة إلى 25% خلال 3 أشهر وإلى 100% خلال 5 سنوات وفق الدليل.",
      condition: "تطبق على شركة التوصية بالأسهم.",
      variantSlug: "partnership-limited-by-shares",
      isRequired: true,
      sortOrder: 2,
      sourcePage: 5,
    },

    {
      code: "CAPITAL-COMPANY-POA",
      title: "صورة توكيلات التأسيس",
      details:
        "صورة التوكيلات في حالة التأسيس عن طريق وكيل، على أن يتضمن التوكيل صلاحية تأسيس الشركات والتوقيع على عقود التأسيس.",
      condition:
        "إذا تم التأسيس عن طريق وكيل، مع مراعاة عدد المؤسسين أو الشركاء المطلوب صدور التوكيل منهم بحسب نوع الشركة.",
      variantSlug: null,
      isRequired: false,
      sortOrder: 3,
      sourcePage: 5,
    },

    {
      code: "CAPITAL-COMPANY-IDENTITY",
      title: "صور إثبات الشخصية للمؤسسين أو الشركاء",
      details:
        "صور واضحة وسارية من إثبات الشخصية، مع جواز الاطلاع على الأصل.",
      condition: "الرقم القومي للمصريين، وجواز السفر للأجانب.",
      variantSlug: null,
      isRequired: true,
      sortOrder: 4,
      sourcePage: 5,
    },

    {
      code: "CAPITAL-COMPANY-AUDITOR-ELIGIBILITY",
      title: "مستخرج رسمي من سجل المحاسبين والمراجعين",
      details:
        "مستخرج رسمي موجه إلى الهيئة يفيد أحقية مراقب الحسابات في مراجعة واعتماد ميزانيات شركات الأموال.",
      condition:
        "يقدم المستند أو صورة وإقرار قبول التعيين وفق الحالة الموضحة بالدليل.",
      variantSlug: null,
      isRequired: true,
      sortOrder: 5,
      sourcePage: 5,
    },

    {
      code: "CAPITAL-COMPANY-LAWYER-CARD",
      title: "صورة كارنيه القيد بنقابة المحامين",
      details:
        "صورة كارنيه القيد للمحامي الذي يصدق على العقد أمام نقابة المحامين.",
      condition:
        "إذا كان رأس المال 20,000 جنيه أو أكثر، يشترط أن يكون القيد بدرجة محام ابتدائي على الأقل وأن يكون الكارنيه ساريًا.",
      variantSlug: null,
      isRequired: false,
      sortOrder: 6,
      sourcePage: 5,
    },

    {
      code: "CAPITAL-COMPANY-ACCOUNTANT-FORMS",
      title: "نماذج مستعلمين عن المؤسسين أو الشركاء",
      details: "نماذج مستعلمين عن المؤسسين أو الشركاء.",
      condition: null,
      variantSlug: null,
      isRequired: true,
      sortOrder: 7,
      sourcePage: 5,
    },

    {
      code: "CAPITAL-COMPANY-LEGAL-ADVISOR",
      title: "بيانات المستشار القانوني للشركة",
      details: "تحديد اسم وعنوان المستشار القانوني للشركة.",
      condition: "ألا تقل درجة القيد عن محام استئناف.",
      variantSlug: null,
      isRequired: true,
      sortOrder: 8,
      sourcePage: 5,
    },

    {
      code: "CAPITAL-COMPANY-AGENT-IDENTITY",
      title: "صورة إثبات شخصية الوكيل",
      details: "صورة واضحة وسارية من إثبات شخصية الوكيل.",
      condition:
        "تقدم عند التأسيس عن طريق وكيل. الرقم القومي للمصري، وجواز السفر للأجنبي مع وجود إقامة سارية.",
      variantSlug: null,
      isRequired: false,
      sortOrder: 9,
      sourcePage: 5,
    },

    {
      code: "CAPITAL-COMPANY-AUTHORITY-APPROVAL",
      title: "موافقة الجهة المختصة",
      details:
        "موافقة الجهة المختصة إذا كان أي من أغراض الشركة يستوجب الحصول على موافقة خاصة.",
      condition: "تطبق وفق القوانين المنظمة للنشاط.",
      variantSlug: null,
      isRequired: false,
      sortOrder: 10,
      sourcePage: 5,
    },

    {
      code: "CAPITAL-COMPANY-IN-KIND-JOINT-STOCK",
      title: "تقرير تقييم الحصة العينية",
      details:
        "أصل تقرير اللجنة المشكلة من الهيئة العامة للاستثمار والمناطق الحرة لتقييم الحصة العينية.",
      condition:
        "عند وجود حصة عينية في شركة مساهمة.",
      variantSlug: "joint-stock",
      isRequired: false,
      sortOrder: 11,
      sourcePage: 5,
    },

    {
      code: "CAPITAL-COMPANY-IN-KIND-PARTNERSHIP",
      title: "تقرير تقييم الحصة العينية",
      details:
        "أصل تقرير اللجنة المشكلة من الهيئة العامة للاستثمار والمناطق الحرة لتقييم الحصة العينية.",
      condition:
        "عند وجود حصة عينية في شركة توصية بالأسهم.",
      variantSlug: "partnership-limited-by-shares",
      isRequired: false,
      sortOrder: 12,
      sourcePage: 5,
    },

    {
      code: "CAPITAL-COMPANY-IN-KIND-LLC",
      title: "تقرير تقييم الحصة العينية",
      details:
        "يجوز الاكتفاء بتقديم تقرير من أهل الخبرة من أصحاب المهن المنظمة بقانون، بحسب طبيعة كل حصة.",
      condition:
        "عند وجود حصة عينية في شركة ذات مسؤولية محدودة.",
      variantSlug: "limited-liability",
      isRequired: false,
      sortOrder: 13,
      sourcePage: 6,
    },

    {
      code: "CAPITAL-COMPANY-FREE-ZONE-APPROVAL",
      title: "موافقة المنطقة الحرة",
      details: "استيفاء موافقة الهيئة قبل التأسيس.",
      condition:
        "عند تأسيس الشركة للعمل بنظام المناطق الحرة العامة، تصدر الموافقة من مجلس إدارة المنطقة الحرة المزمع إقامة المشروع بها.",
      variantSlug: null,
      isRequired: false,
      sortOrder: 14,
      sourcePage: 6,
    },

    {
      code: "CAPITAL-COMPANY-PRIVATE-FREE-ZONE-APPROVAL",
      title: "موافقة مجلس الوزراء",
      details: "استيفاء موافقة مجلس الوزراء قبل التأسيس.",
      condition:
        "عند تأسيس شركة مساهمة أو ذات مسؤولية محدودة للعمل بنظام المناطق الحرة الخاصة.",
      variantSlug: null,
      isRequired: false,
      sortOrder: 15,
      sourcePage: 6,
    },

    {
      code: "CAPITAL-COMPANY-TRANSFORMATION-VALUATION",
      title: "تقرير تقييم صافي أصول وخصوم شركة الأشخاص",
      details:
        "تقرير تقييم الحصة العينية، ويكون التقرير من اللجنة المشكلة بقرار رئيس الهيئة لهذا الغرض.",
      condition:
        "عند تأسيس شركة أموال ناتجة عن تغيير الشكل القانوني لشركة أشخاص.",
      variantSlug: null,
      isRequired: false,
      sortOrder: 16,
      sourcePage: 6,
    },

    {
      code: "CAPITAL-COMPANY-TRANSFORMATION-DOCUMENTS",
      title: "مستندات شركة الأشخاص قبل تغيير الشكل القانوني",
      details:
        "عقد تكوين شركة الأشخاص وملخصه، وكافة عقود التعديلات اللاحقة وملخصاتها المشهرة قانونًا، ومحاضر اجتماعات الشركاء الموضحة بالدليل.",
      condition:
        "عند تأسيس شركة أموال نتيجة تغيير الشكل القانوني لشركة أشخاص.",
      variantSlug: null,
      isRequired: false,
      sortOrder: 17,
      sourcePage: 6,
    },

    {
      code: "CAPITAL-COMPANY-SPLIT-DECISION",
      title: "قرار رئيس الهيئة بالتقسيم",
      details: "قرار رئيس الهيئة بالتقسيم.",
      condition:
        "عند تأسيس شركة أموال عن طريق انقسام شركة قائمة إلى شركتين أو أكثر.",
      variantSlug: null,
      isRequired: false,
      sortOrder: 18,
      sourcePage: 6,
    },

    {
      code: "CAPITAL-COMPANY-SPLIT-VALUATION",
      title: "تقرير تقييم الحصة العينية عند الانقسام",
      details: "تقرير تقييم الحصة العينية.",
      condition:
        "عند تأسيس شركة أموال عن طريق انقسام شركة قائمة.",
      variantSlug: null,
      isRequired: false,
      sortOrder: 19,
      sourcePage: 6,
    },

    {
      code: "CAPITAL-COMPANY-SPLIT-REGISTRY",
      title: "السجل التجاري للشركة القاسمة",
      details:
        "السجل التجاري للشركة القاسمة والمؤشر به بالانقسام.",
      condition:
        "عند تأسيس شركة أموال عن طريق انقسام شركة قائمة.",
      variantSlug: null,
      isRequired: false,
      sortOrder: 20,
      sourcePage: 6,
    },

    {
      code: "CAPITAL-COMPANY-SPLIT-ASSEMBLY-MINUTES",
      title: "محضر الجمعية العامة غير العادية بالموافقة على الانقسام",
      details:
        "صورة من محضر اجتماع الجمعية العامة غير العادية للشركة بالموافقة على الانقسام، ومعتمد من الهيئة.",
      condition:
        "عند تأسيس شركة أموال عن طريق انقسام شركة قائمة.",
      variantSlug: null,
      isRequired: false,
      sortOrder: 21,
      sourcePage: 6,
    },

    {
      code: "CAPITAL-COMPANY-SPLIT-VALUATION-MINUTES",
      title: "محضر الجمعية العامة غير العادية بالموافقة على تقرير التقييم",
      details:
        "صورة من محضر اجتماع الجمعية العامة غير العادية للشركة بالموافقة على تقرير التقييم، ومعتمد من الهيئة.",
      condition:
        "عند تأسيس شركة أموال عن طريق انقسام شركة قائمة.",
      variantSlug: null,
      isRequired: false,
      sortOrder: 22,
      sourcePage: 6,
    },

    {
      code: "CAPITAL-COMPANY-SPLIT-PROJECT",
      title: "مشروع عقد الانقسام",
      details: "مشروع عقد الانقسام المعتمد من الهيئة.",
      condition:
        "عند تأسيس شركة أموال عن طريق انقسام شركة قائمة.",
      variantSlug: null,
      isRequired: false,
      sortOrder: 23,
      sourcePage: 6,
    },
  ];

  // ==========================================
  // 5. إضافة المستندات إلى قاعدة البيانات
  // ==========================================

  for (const item of requirements) {
    const variantId = item.variantSlug
      ? variants[item.variantSlug]
      : null;

    await prisma.serviceDocumentRequirement.upsert({
      where: {
        code: item.code,
      },
      update: {
        serviceId: service.id,
        variantId,
        title: item.title,
        details: item.details,
        condition: item.condition,
        isRequired: item.isRequired,
        sortOrder: item.sortOrder,
        sourcePage: item.sourcePage,
        sourceNote: "دليل خدمات مركز المستثمرين GAFI - صفحات 5 و6",
      },
      create: {
        code: item.code,
        serviceId: service.id,
        variantId,
        title: item.title,
        details: item.details,
        condition: item.condition,
        isRequired: item.isRequired,
        sortOrder: item.sortOrder,
        sourcePage: item.sourcePage,
        sourceNote: "دليل خدمات مركز المستثمرين GAFI - صفحات 5 و6",
      },
    });
  }

  // ==========================================
  // 6. التحقق من البيانات بعد الإدخال
  // ==========================================

  const result = await prisma.service.findUnique({
    where: {
      id: service.id,
    },
    include: {
      category: true,
      variants: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      documentRequirements: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });

  if (!result) {
    throw new Error("لم يتم العثور على الخدمة بعد الإدخال");
  }

  console.log("\n================================");
  console.log("تم إدخال الخدمة بنجاح");
  console.log("================================");
  console.log("التصنيف:", result.category.name);
  console.log("الخدمة:", result.name);
  console.log("عدد أنواع الشركات:", result.variants.length);
  console.log(
    "عدد متطلبات المستندات:",
    result.documentRequirements.length
  );
  console.log("\nأنواع الشركات:");

  for (const variant of result.variants) {
    console.log("-", variant.name);
  }

  console.log("\nتم الانتهاء بنجاح.");
}

main()
  .catch((error) => {
    console.error("حدث خطأ أثناء إضافة الخدمات:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
