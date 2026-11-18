
import AppShell from "@/components/AppShell";
import ReportsManagement from "@/components/ReportsManagement";
import { requireUser } from "@/lib/auth";

export const instant = false;

export default async function ReportsPage() {
  const user = await requireUser();

  return (
    <AppShell user={user}>
      <ReportsManagement />
    </AppShell>
  );
}
