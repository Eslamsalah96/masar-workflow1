
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <div>
        <h1>غير مسموح بالدخول</h1>
        <p>ليس لديك الصلاحية اللازمة لفتح هذه الصفحة.</p>
        <Link href="/">العودة إلى الصفحة الرئيسية</Link>
      </div>
    </main>
  );
}
