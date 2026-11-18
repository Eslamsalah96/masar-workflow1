
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import RequestDetails from "@/components/RequestDetails";
import { requireUser } from "@/lib/auth";

export const instant = false;

export default async function RequestDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  if (!id) notFound();

  return (
    <AppShell user={user}>
      <RequestDetails requestId={id} />
    </AppShell>
  );
}
