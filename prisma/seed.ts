
import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  // إنشاء الأقسام الأربعة
  const departmentNames = [
  "الضرائب",
  "الحسابات",
  "الإجراءات",
  "خدمة العملاء واتصالات العملاء",
  "السكرتارية",
];

  const departments = await Promise.all(
    departmentNames.map((name) =>
      prisma.department.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  const [
  taxes,
  accounts,
  procedures,
  customerService,
  secretariat,
] = departments;

  // تشفير كلمات المرور
  const passwordHash = await hash("Masar@2026", 10);

  // المدير العام
  await prisma.user.upsert({
    where: { email: "admin@masar.com" },
    update: {
      name: "المدير العام",
      role: "GENERAL_MANAGER",
      passwordHash,
      departmentId: null,
    },
    create: {
      name: "المدير العام",
      email: "admin@masar.com",
      passwordHash,
      role: "GENERAL_MANAGER",
    },
  });

  // ==========================================
// مستخدمو المرحلة الأولى
// ==========================================

// السكرتيرة
await prisma.user.upsert({
  where: { email: "secretary@masar.com" },
  update: {
    name: "السكرتيرة",
    role: "SECRETARY",
    departmentId: secretariat.id,
    passwordHash,
    isActive: true,
  },
  create: {
    name: "السكرتيرة",
    email: "secretary@masar.com",
    passwordHash,
    role: "SECRETARY",
    departmentId: secretariat.id,
  },
});

// خدمة العملاء
await prisma.user.upsert({
  where: { email: "customer.service@masar.com" },
  update: {
    name: "موظف خدمة العملاء",
    role: "CUSTOMER_SERVICE",
    departmentId: customerService.id,
    passwordHash,
    isActive: true,
  },
  create: {
    name: "موظف خدمة العملاء",
    email: "customer.service@masar.com",
    passwordHash,
    role: "CUSTOMER_SERVICE",
    departmentId: customerService.id,
  },
});

  // مدراء الأقسام
  const managers = [
    {
      name: "مدير الضرائب",
      email: "tax.manager@masar.com",
      departmentId: taxes.id,
    },
    {
      name: "مدير الحسابات",
      email: "accounts.manager@masar.com",
      departmentId: accounts.id,
    },
    {
      name: "مدير الإجراءات",
      email: "procedures.manager@masar.com",
      departmentId: procedures.id,
    },
    {
      name: "مدير خدمة العملاء",
      email: "service.manager@masar.com",
      departmentId: customerService.id,
    },
  ];

  for (const manager of managers) {
    await prisma.user.upsert({
      where: { email: manager.email },
      update: {
        name: manager.name,
        role: "DEPARTMENT_MANAGER",
        departmentId: manager.departmentId,
        passwordHash,
      },
      create: {
        ...manager,
        passwordHash,
        role: "DEPARTMENT_MANAGER",
      },
    });
  }

  // موظفون تجريبيون
  const employees = [
    {
      name: "موظف الضرائب 1",
      email: "tax.employee1@masar.com",
      departmentId: taxes.id,
    },
    {
      name: "موظف الضرائب 2",
      email: "tax.employee2@masar.com",
      departmentId: taxes.id,
    },
    {
      name: "موظف الحسابات 1",
      email: "accounts.employee1@masar.com",
      departmentId: accounts.id,
    },
    {
      name: "موظف الحسابات 2",
      email: "accounts.employee2@masar.com",
      departmentId: accounts.id,
    },
    {
      name: "موظف الإجراءات 1",
      email: "procedures.employee1@masar.com",
      departmentId: procedures.id,
    },
    {
      name: "موظف الإجراءات 2",
      email: "procedures.employee2@masar.com",
      departmentId: procedures.id,
    },
    {
      name: "موظف خدمة العملاء 1",
      email: "service.employee1@masar.com",
      departmentId: customerService.id,
    },
    {
      name: "موظف خدمة العملاء 2",
      email: "service.employee2@masar.com",
      departmentId: customerService.id,
    },
  ];

  for (const employee of employees) {
    await prisma.user.upsert({
      where: { email: employee.email },
      update: {
        name: employee.name,
        role: "EMPLOYEE",
        departmentId: employee.departmentId,
        passwordHash,
      },
      create: {
        ...employee,
        passwordHash,
        role: "EMPLOYEE",
      },
    });
  }

  console.log("تم إنشاء الأقسام والمستخدمين التجريبيين بنجاح.");
}

main()
  .catch((error) => {
    console.error("حدث خطأ أثناء إضافة البيانات:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
