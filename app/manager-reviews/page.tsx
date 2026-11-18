
import AppShell from "@/components/AppShell";
import ManagerReviewManagement from "@/components/ManagerReviewManagement";
import { requireRole } from "@/lib/permissions";

export const instant = false;

export default async function ManagerReviewsPage() {
  const user = await requireRole([
    "GENERAL_MANAGER",
    "DEPARTMENT_MANAGER",
  ]);

  return (
    <AppShell user={user}>
      <ManagerReviewManagement />
    </AppShell>
  );
}
