import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ plan: string }>;
}

export default async function LegacyCheckoutRedirect({ params }: PageProps) {
  const { plan } = await params;
  redirect(`/planning/${plan || "starter"}`);
}
