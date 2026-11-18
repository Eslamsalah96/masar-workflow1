
import AppShell from "@/components/AppShell";
import TransferManagement from "@/components/TransferManagement";
import { requireRole } from "@/lib/permissions";

export const instant = false;

export default async function TransfersPage() {
  const user = await requireRole([
    "GENERAL_MANAGER",
    "DEPARTMENT_MANAGER",
  ]);

  return (
    <AppShell user={user}>
      <TransferManagement />
    </AppShell>
  );
}
