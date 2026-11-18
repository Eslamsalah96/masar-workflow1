
import AppShell from "@/components/AppShell";
import DailyTasksManagement from "@/components/DailyTasksManagement";
import { requireUser } from "@/lib/auth";

export const instant = false;

export default async function DailyTasksPage() {
  const user = await requireUser();

  return (
    <AppShell user={user}>
      <DailyTasksManagement />
    </AppShell>
  );
}
