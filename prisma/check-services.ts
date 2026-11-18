
import { prisma } from "../lib/prisma";

async function main() {
  console.log("\n========== تصنيفات الخدمات ==========\n");

  const categories = await prisma.serviceCategory.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      sortOrder: "asc",
    },
    include: {
      services: {
        where: {
          isActive: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
        include: {
          variants: {
            where: {
              isActive: true,
            },
            orderBy: {
              sortOrder: "asc",
            },
            include: {
              documentRequirements: {
                where: {
                  isActive: true,
                },
                orderBy: {
                  sortOrder: "asc",
                },
                include: {
                  conditions: {
                    include: {
                      question: true,
                    },
                  },
                },
              },
            },
          },

          documentRequirements: {
            where: {
              isActive: true,
              variantId: null,
            },
            orderBy: {
              sortOrder: "asc",
            },
            include: {
              conditions: {
                include: {
                  question: true,
                },
              },
            },
          },

          questions: {
            where: {
              isActive: true,
            },
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      },
    },
  });

  for (const category of categories) {
    console.log(`التصنيف: ${category.name}`);
    console.log("========================================\n");

    for (const service of category.services) {
      console.log(`الخدمة: ${service.name}`);
      console.log(`عدد أنواع الشركات: ${service.variants.length}`);

      const genericRequirements = service.documentRequirements;

      console.log(
        `عدد المتطلبات العامة النشطة: ${genericRequirements.length}`
      );

      console.log(`عدد الأسئلة النشطة: ${service.questions.length}`);

      if (service.questions.length > 0) {
        console.log("\nالأسئلة:");

        for (const question of service.questions) {
          console.log(
            `- ${question.label} (${question.type}) ${
              question.isRequired ? "[إلزامي]" : "[اختياري]"
            }`
          );
        }
      }

      for (const variant of service.variants) {
        console.log(`\nنوع الشركة: ${variant.name}`);

        const requirements = [
          ...genericRequirements,
          ...variant.documentRequirements,
        ].sort((a, b) => a.sortOrder - b.sortOrder);

        console.log(
          `عدد متطلبات المستندات النشطة: ${requirements.length}`
        );

        if (requirements.length === 0) {
          console.log("لا توجد متطلبات نشطة.");
          continue;
        }

        console.log("المستندات والبيانات:");

        for (const requirement of requirements) {
          const requiredLabel = requirement.isRequired
            ? "[إلزامي]"
            : "[اختياري]";

          const kindLabel =
            requirement.kind === "DATA" ? "[بيانات]" : "[مستند]";

          console.log(
            `- ${requiredLabel} ${kindLabel} ${requirement.title}`
          );

          if (requirement.applicability !== "ALL") {
            console.log(
              `  ينطبق على: ${requirement.applicability}`
            );
          }

          if (requirement.condition) {
            console.log(`  ملاحظة الشرط: ${requirement.condition}`);
          }

          if (requirement.conditions.length > 0) {
            console.log("  شروط الظهور:");

            for (const condition of requirement.conditions) {
              console.log(
                `    - ${condition.question.label} = ${condition.expectedValue}`
              );
            }
          }
        }
      }

      console.log("\n----------------------------------------\n");
    }
  }

  console.log("========== انتهى عرض البيانات ==========\n");
}

main()
  .catch((error) => {
    console.error("حدث خطأ أثناء فحص الخدمات:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
