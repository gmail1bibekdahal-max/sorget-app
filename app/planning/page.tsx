import { redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateDefaultWorkspace } from "@/lib/workspaces";
import { resolvePlanKey } from "@/lib/billing";
import styles from "./Planning.module.css";
import PlanningClient from "./PlanningClient";

export const metadata = {
  title: "Choose your plan — Sorget",
};

interface PageProps {
  searchParams?: Promise<{ returnTo?: string }>;
}

export default async function PlanningPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspace = await getOrCreateDefaultWorkspace(supabase, user.id, user.email, user.user_metadata?.full_name);
  const admin = createAdminClient();
  const db = admin || supabase;
  const { data: sub } = await db
    .from("subscriptions")
    .select("plan_id, razorpay_subscription_id, status")
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  const currentPlan = sub ? resolvePlanKey(sub) : "";
  const params = searchParams ? await searchParams : {};
  const returnTo = params.returnTo || "";

  return (
    <div className={styles.page}>
      {/* Left: plans */}
      <div className={styles.plansSide}>
        <div className={styles.header}>
          <h1 className={styles.title}>Choose your plan</h1>
          <p className={styles.subtitle}>Start free for 14 days. No commitment.</p>
        </div>
        <PlanningClient currentPlan={currentPlan} returnTo={returnTo} />
      </div>

      {/* Right: brand panel */}
      <div className={styles.brandSide}>
        <a href="/" className={styles.brandLogo}>
          <Image src="/logo.png" alt="Sorget" width={32} height={32} className={styles.brandLogoImg} priority />
          <span>Sorget</span>
        </a>

        <h2 className={styles.brandHeadline}>Know exactly which marketing drives revenue.</h2>

        <p className={styles.brandBody}>
          Sorget captures UTM parameters, referral sources, and landing pages — and passes them into every lead in your CRM.
        </p>

        <div className={styles.brandDivider} />

        <ul className={styles.brandFeatures}>
          {[
            "Automatic UTM capture on every form submission",
            "Works with any CMS, form tool, or CRM",
            "No developer needed — install in minutes",
            "14-day free trial, cancel anytime",
          ].map((f) => (
            <li key={f}>
              <span className={styles.brandCheck}>✓</span>
              {f}
            </li>
          ))}
        </ul>

        <p className={styles.brandTagline}>
          Trusted by marketing teams who want to prove ROI — not just report on clicks.
        </p>
      </div>
    </div>
  );
}
