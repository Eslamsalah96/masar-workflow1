
import type { Metadata } from "next";
import "./globals.css";
import "./modern-theme.css";

export const metadata: Metadata = {
  title: "نظام متابعة الإجراءات",
  description: "Khater El-Louaj Workflow Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
