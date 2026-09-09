import { redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import styles from "./Planning.module.css";
import PlanningClient from "./PlanningClient";

export const metadata = {
  title: "Choose your plan — Attributer",
};

export default async function PlanningPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className={styles.page}>
      {/* Left: plans */}
      <div className={styles.plansSide}>
        <div className={styles.header}>
          <h1 className={styles.title}>Choose your plan</h1>
          <p className={styles.subtitle}>Start free for 14 days. No commitment.</p>
        </div>
        <PlanningClient />
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
