import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Sorget — App",
  description: "Core Sorget Application",
};

/**
 * Root Application Entry Point
 *
 * Project B is an application-only service (app.sorget.site).
 * There is no public marketing landing page here.
 *
 * Routing behavior:
 * - Authenticated:   / -> /dashboard
 * - Unauthenticated: / -> /login
 */
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}