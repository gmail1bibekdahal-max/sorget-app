import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ workspace?: string; error?: string; success?: string; notice?: string }>;
}

export default async function BillingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = new URLSearchParams();
  q.set("tab", "billing");
  if (params.workspace) q.set("workspace", params.workspace);
  if (params.error) q.set("error", params.error);
  if (params.success) q.set("success", params.success);
  if (params.notice) q.set("notice", params.notice);

  redirect(`/dashboard/settings?${q.toString()}`);
}