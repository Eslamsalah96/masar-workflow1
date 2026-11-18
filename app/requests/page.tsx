
import AppShell from "@/components/AppShell";
import RequestList from "@/components/RequestList";
import { requireUser } from "@/lib/auth";

export const instant = false;

export default async function RequestsPage() {
  const user = await requireUser();

  return (
    <AppShell user={user}>
      <RequestList />
    </AppShell>
  );
}
