
import AppShell from "@/components/AppShell";
import TaskManagement from "@/components/TaskManagement";
import { requireRole } from "@/lib/permissions";

export const instant = false;

export default async function TasksPage() {
  const user = await requireRole([
    "GENERAL_MANAGER",
    "DEPARTMENT_MANAGER",
  ]);

  return (
    <AppShell user={user}>
      <TaskManagement />
    </AppShell>
  );
}
