
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  user: {
    name: string;
    email: string;
    role: string;
    department?: {
      name: string;
    } | null;
  };
};

const roleNames: Record<string, string> = {
  GENERAL_MANAGER: "المدير العام",
  DEPARTMENT_MANAGER: "مدير قسم",
  EMPLOYEE: "موظف",
  SECRETARY: "سكرتارية",
  CUSTOMER_SERVICE: "خدمة العملاء",
};

export default function Header({ user }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;

    setLoading(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("تعذر تسجيل الخروج");
      }

      router.replace("/login");
      router.refresh();
    } catch {
      alert("حدث خطأ أثناء تسجيل الخروج. حاول مرة أخرى.");
      setLoading(false);
    }
  }

  const initials = user.name?.trim()?.charAt(0) || "م";
  const roleName = roleNames[user.role] || user.role;

  return (
    <header className="app-header" dir="rtl">
      <div className="header-welcome">
        <span className="header-small-label">
          نظام إدارة الإجراءات
        </span>
        <strong>مرحبًا، {user.name}</strong>
      </div>

      <div className="header-user-area">
        <div className="header-user-info">
          <strong>{user.name}</strong>
          <span>
            {roleName}
            {user.department?.name
              ? ` · ${user.department.name}`
              : ""}
          </span>
        </div>

        <div className="header-avatar" title={user.name}>
          {initials}
        </div>

        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
          disabled={loading}
        >
          {loading ? "جاري الخروج..." : "تسجيل الخروج"}
        </button>
      </div>
    </header>
  );
}
