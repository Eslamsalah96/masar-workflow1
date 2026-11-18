
import { prisma } from "../lib/prisma";

async function main() {
  const departments = await prisma.department.findMany();

  const users = await prisma.user.findMany({
    select: {
      name: true,
      email: true,
      role: true,
      department: {
        select: {
          name: true,
        },
      },
    },
  });

  console.log("\n--- الأقسام ---");
  console.log(departments);

  console.log("\n--- المستخدمون ---");
  console.table(
    users.map((user) => ({
      الاسم: user.name,
      البريد: user.email,
      الوظيفة: user.role,
      القسم: user.department?.name ?? "الإدارة العامة",
    }))
  );

  console.log("\nعدد الأقسام:", departments.length);
  console.log("عدد المستخدمين:", users.length);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
