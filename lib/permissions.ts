
import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";

export const ROLES = {
  GENERAL_MANAGER: "GENERAL_MANAGER",
  DEPARTMENT_MANAGER: "DEPARTMENT_MANAGER",
  EMPLOYEE: "EMPLOYEE",
  SECRETARY: "SECRETARY",
  CUSTOMER_SERVICE: "CUSTOMER_SERVICE",
} as const;

// التحقق من تسجيل الدخول والدور
export async function requireRole(allowedRoles: string[]) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!allowedRoles.includes(user.role)) {
    redirect("/unauthorized");
  }

  return user;
}

// المدير العام فقط
export async function requireGeneralManager() {
  return requireRole([ROLES.GENERAL_MANAGER]);
}

// المدير العام ومديرو الأقسام
// تستخدم في الصفحات الإدارية العامة، وليس مراجعة الطلبات
export async function requireDepartmentManager() {
  return requireRole([
    ROLES.GENERAL_MANAGER,
    ROLES.DEPARTMENT_MANAGER,
  ]);
}

// الموظفون والمديرون والمدير العام
export async function requireEmployee() {
  return requireRole([
    ROLES.GENERAL_MANAGER,
    ROLES.DEPARTMENT_MANAGER,
    ROLES.EMPLOYEE,
  ]);
}

// صلاحية تسجيل الطلبات
export async function requireRequestRegistration() {
  return requireRole([
    ROLES.GENERAL_MANAGER,
    ROLES.SECRETARY,
    ROLES.CUSTOMER_SERVICE,
  ]);
}

// مدير إدارة الإجراءات فقط
export async function requireProceduresManager() {
  const user = await requireRole([
    ROLES.DEPARTMENT_MANAGER,
  ]);

  if (user.department?.name !== "الإجراءات") {
    redirect("/unauthorized");
  }

  return user;
}

// التحقق من الوصول إلى قسم معين
export async function canAccessDepartment(departmentId: string) {
  const user = await getCurrentUser();

  if (!user) return false;

  if (user.role === ROLES.GENERAL_MANAGER) {
    return true;
  }

  return user.departmentId === departmentId;
}
