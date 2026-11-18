
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  role: string;
};

export default function Sidebar({ role }: Props) {
  const pathname = usePathname();

  const isManager =
    role === "GENERAL_MANAGER" || role === "DEPARTMENT_MANAGER";

  const isGeneralManager = role === "GENERAL_MANAGER";
  const isEmployee = role === "EMPLOYEE";
  const isSecretary = role === "SECRETARY";
  const isCustomerService = role === "CUSTOMER_SERVICE";

  const links = [
    {
      href: "/",
      title: "لوحة التحكم",
      icon: "⌂",
      show: true,
    },
    {
      href: "/requests",
      title: "الطلبات",
      icon: "▤",
      show: true,
    },
    {
      href: "/manager-reviews",
      title: "مراجعة الطلبات",
      icon: "☑",
      show: isManager,
    },
    {
      href: "/transfers",
      title: "تحويل الطلبات",
      icon: "⇄",
      show: isManager,
    },
    {
      href: "/customers",
      title: "العملاء",
      icon: "♙",
      show: true,
    },
    {
      href: "/tasks",
      title: "المهام",
      icon: "✓",
      show: isManager || isEmployee,
    },
    {
      href: "/daily-tasks",
      title: "المهام اليومية",
      icon: "◷",
      show: true,
    },
    {
      href: "/departments",
      title: "الأقسام",
      icon: "▦",
      show: isManager,
    },
    {
      href: "/users",
      title: "المستخدمون",
      icon: "♧",
      show: isGeneralManager,
    },
    {
      href: "/reports",
      title: "التقارير",
      icon: "▥",
      show: isManager,
    },
    {
      href: "/settings",
      title: "الإعدادات",
      icon: "⚙",
      show: isGeneralManager,
    },
  ];

  const visibleLinks = links.filter((link) => link.show);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside
      dir="rtl"
      style={{
        width: "260px",
        minWidth: "260px",
        minHeight: "100vh",
        background: "#123b5d",
        color: "#fff",
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      <div
        style={{
          padding: "8px 12px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <div style={{ fontSize: "23px", fontWeight: 800 }}>
          خاطر اللواج
        </div>
        <div
          style={{
            fontSize: "13px",
            color: "#c7d8e6",
            marginTop: "7px",
          }}
        >
          نظام إدارة الإجراءات
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        {visibleLinks.map((link) => {
          const active = isActive(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 14px",
                borderRadius: "9px",
                textDecoration: "none",
                color: "#fff",
                background: active
                  ? "#1e5b85"
                  : "transparent",
                borderRight: active
                  ? "4px solid #fff"
                  : "4px solid transparent",
                fontWeight: active ? 700 : 500,
                transition: "background 0.2s ease",
              }}
            >
              <span
                style={{
                  width: "24px",
                  textAlign: "center",
                  fontSize: "19px",
                }}
              >
                {link.icon}
              </span>

              <span>{link.title}</span>
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          marginTop: "auto",
          padding: "14px 12px",
          borderTop: "1px solid rgba(255,255,255,0.15)",
          fontSize: "12px",
          color: "#c7d8e6",
        }}
      >
        نظام إدارة الإجراءات
      </div>
    </aside>
  );
}
