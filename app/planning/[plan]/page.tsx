import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/billing";
import { activateFreeTrial } from "@/app/actions/billing";
import { getPaddlePriceId, getPaddleConfig } from "@/lib/paddle";
import SubmitButton from "@/app/components/SubmitButton";
import PaddlePlaceholderButton from "@/app/components/PaddlePlaceholderButton";
import styles from "../checkout/Checkout.module.css";

interface PageProps {
  params: Promise<{ plan: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { plan: planParam } = await params;
  const planKey = planParam.toLowerCase().replace(/\s+/g, "-");
  const plan = PLANS[planKey] || PLANS.starter;
  return {
    title: `${plan.name} Plan — Sorget`,
    description: `Complete your setup for Sorget ${plan.name} plan with a 14-day free trial.`,
  };
}

export default async function SelectedPlanPage({ params }: PageProps) {
  const { plan: planParam } = await params;
  const planKey = planParam.toLowerCase().replace(/\s+/g, "-");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const plan = PLANS[planKey] || PLANS.starter;
  const paddlePriceId = getPaddlePriceId(planKey);
  const paddleConfig = getPaddleConfig();

  const isCustom = planKey === "custom";

  const d = new Date();
  d.setDate(d.getDate() + 14);
  const trialEndStr = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const inclusions = [
    plan.websiteLimit === 1 ? "1 website" : `${plan.websiteLimit} websites`,
    plan.leadsMonthlyLimit >= 1000000
      ? "Custom lead capacity"
      : plan.websiteLimit > 1
      ? "Full attribution analytics"
      : `Up to ${plan.leadsMonthlyLimit.toLocaleString()} leads/month`,
    "14-day free trial included",
    "First-touch and multi-touch UTM tracking",
    "CRM and webhook sync",
  ];

  const TRUST_POINTS = [
    `14-day free trial active until ${trialEndStr}`,
    "Cancel anytime in 1 click before trial ends",
    "All marketing attribution features included",
    "No disruption to existing website traffic",
  ];

  return (
    <div className={styles.page}>
      {/* Left: Selected Plan & Payment Actions */}
      <div className={styles.formSide}>
        <div className={styles.card}>
          <Link href="/planning" className={styles.backLink}>
            ← Back to all plans
          </Link>

          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#BB0C68",
              display: "block",
              marginBottom: "0.3rem",
            }}
          >
            Selected Plan
          </span>

          <h1 className={styles.title}>Sorget {plan.name}</h1>

          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", margin: "0.75rem 0 1.25rem" }}>
            <span style={{ fontSize: "2rem", fontWeight: 800, color: "#3A313C" }}>
              ${plan.priceMonthlyUsd}
            </span>
            <span style={{ color: "#717680", fontSize: "0.95rem", fontWeight: 500 }}>
              / month
            </span>
            <span
              style={{
                marginLeft: "auto",
                background: "#ecfdf5",
                color: "#065f46",
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "6px",
              }}
            >
              14-Day Free Trial
            </span>
          </div>

          <div
            style={{
              background: "#fafafa",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#4b5563", marginBottom: "0.5rem", textTransform: "uppercase" }}>
              Plan Inclusions
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {inclusions.map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.875rem", color: "#374151" }}>
                  <span style={{ color: "#059669", fontWeight: 700 }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {isCustom ? (
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <p style={{ color: "#4b5563", marginBottom: "1.25rem", fontSize: "0.95rem" }}>
                Our team will tailor website limits and dedicated support for your organization.
              </p>
              <a
                href="mailto:sales@sorget.site?subject=Sorget%20Custom%20Plan%20Inquiry"
                className={styles.btnPrimary}
                style={{ display: "inline-flex", justifyContent: "center", alignItems: "center", textDecoration: "none" }}
              >
                Contact Sales Team →
              </a>
            </div>
          ) : (
            <>
              {/* Paddle Payment Action (Sandbox configured) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <PaddlePlaceholderButton
                  id="btn-paddle-checkout"
                  className={styles.btnPrimary}
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    textDecoration: "none",
                    background: "#3A313C",
                    cursor: "pointer",
                  }}
                  title={`Paddle Price ID: ${paddlePriceId || "sandbox"}`}
                />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    margin: "0.25rem 0",
                    color: "#9ca3af",
                    fontSize: "0.85rem",
                  }}
                >
                  <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
                  <span>or</span>
                  <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
                </div>

                {/* 14-Day Free Trial Direct Activation */}
                <form action={activateFreeTrial} style={{ width: "100%" }}>
                  <input type="hidden" name="plan" value={planKey} />
                  <SubmitButton
                    id="btn-start-free-trial"
                    className={styles.btnPrimary}
                    pendingText="Activating..."
                    style={{
                      background: "#BB0C68",
                      width: "100%",
                      justifyContent: "center",
                    }}
                  >
                    Start 14-Day Free Trial
                  </SubmitButton>
                </form>
              </div>

              <p style={{ fontSize: "0.8rem", color: "#9ca3af", textAlign: "center", marginTop: "1rem", lineHeight: 1.5 }}>
                14 days free, then ${plan.priceMonthlyUsd}/mo. No commitment. Cancel anytime before {trialEndStr} to avoid charges.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Right: Trust Panel */}
      <div className={styles.trustSide}>
        <a href="https://sorget.site/" className={styles.trustLogo}>
          <Image src="/logo.png" alt="Sorget Logo" width={32} height={32} className={styles.trustLogoImg} priority />
          <span>Sorget</span>
        </a>

        <h2 className={styles.trustHeadline}>
          Start your 14-day free trial of Sorget {plan.name}
        </h2>
        <p className={styles.trustSubtitle}>
          ${plan.priceMonthlyUsd}/month after your trial. Instant access to full attribution tracking.
        </p>

        <div className={styles.trustDivider} />

        <ul className={styles.trustList}>
          {TRUST_POINTS.map((item) => (
            <li key={item}>
              <span className={styles.trustCheck}>✓</span>
              {item}
            </li>
          ))}
        </ul>

        <p className={styles.trustNote}>
          Your first website is already connected and ready to receive attribution data once trial starts.
        </p>
      </div>
    </div>
  );
}
