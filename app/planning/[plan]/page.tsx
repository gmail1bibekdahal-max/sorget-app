import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { PLANS, resolvePlanKey } from "@/lib/billing";
import { activateFreeTrial, submitEarlyAccess } from "@/app/actions/billing";
import SubmitButton from "@/app/components/SubmitButton";
import styles from "../checkout/Checkout.module.css";

interface PageProps {
  params: Promise<{ plan: string }>;
  searchParams?: Promise<{ returnTo?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { plan: planParam } = await params;
  const planKey = planParam.toLowerCase().replace(/\s+/g, "-");
  const canonicalSelectedKey = resolvePlanKey({ plan_id: planKey, razorpay_subscription_id: planKey });
  const plan = PLANS[canonicalSelectedKey] || PLANS["1-site"];
  return {
    title: `Start with Sorget: ${plan.name} Plan`,
    description: `Get early access to Sorget for the ${plan.name} plan and start tracking lead attribution.`,
  };
}

export default async function SelectedPlanPage({ params, searchParams }: PageProps) {
  const { plan: planParam } = await params;
  const planKey = planParam.toLowerCase().replace(/\s+/g, "-");
  const canonicalSelectedKey = resolvePlanKey({ plan_id: planKey, razorpay_subscription_id: planKey });
  const sParams = searchParams ? await searchParams : {};
  const returnTo = sParams.returnTo || "";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const plan = PLANS[canonicalSelectedKey] || PLANS["1-site"];
  const isCustom = planKey === "custom";

  const sitesText = `${plan.websiteLimit} ${plan.websiteLimit === 1 ? "website" : "websites"}`;
  const leadsText =
    plan.leadsMonthlyLimit >= 1000000
      ? "custom leads"
      : `${plan.leadsMonthlyLimit.toLocaleString()} leads/month`;

  const planSummary = isCustom
    ? "Custom pricing · Custom websites · Custom leads"
    : `$${plan.priceMonthlyUsd}/month · ${sitesText} · ${leadsText}`;

  const FEATURE_POINTS = [
    "Full access to multi-touch attribution engine",
    "Attribution tracking across Google, Meta, Organic & Direct",
    "Real-time CRM & webhook sync",
    "No payment required during the trial",
  ];

  return (
    <div className={styles.page}>
      {/* Left: Selected Plan & Early Access / Trial Form */}
      <div className={styles.formSide}>
        <div className={styles.card}>
          <Link href={`/planning${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`} className={styles.backLink}>
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

          <h1 className={styles.title} style={{ fontSize: "28px", marginBottom: "0.35rem" }}>
            Start with Sorget
          </h1>

          <p style={{ fontSize: "1rem", color: "#3A313C", fontWeight: 600, margin: "0.25rem 0 1.5rem" }}>
            {planSummary}
          </p>

          {isCustom ? (
            <div style={{ textAlign: "center", padding: "1.25rem 0" }}>
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
            <div style={{ display: "flex", flexDirection: "column" }}>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#3A313C", margin: "0 0 1.25rem" }}>
                Choose how you&apos;d like to continue
              </h2>

              {/* Option 1: Early Access */}
              <div style={{ marginBottom: "1.25rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#3A313C", margin: "0 0 0.25rem" }}>
                  Early Access
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "0 0 0.75rem" }}>
                  Join Sorget early and get access to the platform as we continue improving the product.
                </p>

                <form action={submitEarlyAccess} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <input type="hidden" name="plan" value={planKey} />
                  {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

                  <input
                    type="email"
                    name="email"
                    id="input-early-access-email"
                    className={styles.fieldInput}
                    placeholder="Email Address"
                    defaultValue={user.email || ""}
                    required
                    aria-label="Email Address"
                  />

                  <SubmitButton
                    id="btn-get-early-access"
                    className={styles.btnPrimary}
                    pendingText="Submitting..."
                    style={{
                      background: "#3A313C",
                      width: "100%",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    Continue with Email
                  </SubmitButton>
                </form>
              </div>

              {/* OR Divider */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  margin: "0.75rem 0 1.25rem",
                  color: "#9ca3af",
                  fontSize: "0.8rem",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
                <span>OR</span>
                <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
              </div>

              {/* Option 2: 14-Day Free Trial */}
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#3A313C", margin: "0 0 0.25rem" }}>
                  14-Day Free Trial
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "0 0 0.75rem" }}>
                  Start your 14-day free trial and explore Sorget with your selected plan.
                </p>

                <form action={activateFreeTrial} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <input type="hidden" name="plan" value={planKey} />
                  {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

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

                <p style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.6rem", textAlign: "center" }}>
                  No payment required during the trial.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Product & Early Access Overview Panel */}
      <div className={styles.trustSide}>
        <a href="https://sorget.site/" className={styles.trustLogo}>
          <Image src="/logo.png" alt="Sorget Logo" width={32} height={32} className={styles.trustLogoImg} priority />
          <span>Sorget</span>
        </a>

        <h2 className={styles.trustHeadline}>
          Start with Sorget
        </h2>
        <p className={styles.trustSubtitle}>
          Know exactly which campaigns, ads, and channels drive your revenue and leads.
        </p>

        <div className={styles.trustDivider} />

        <ul className={styles.trustList}>
          {FEATURE_POINTS.map((item) => (
            <li key={item}>
              <span className={styles.trustCheck}>✓</span>
              {item}
            </li>
          ))}
        </ul>

        <p className={styles.trustNote}>
          Instant snippet setup. Start capturing first-touch and multi-touch lead attribution in minutes.
        </p>
      </div>
    </div>
  );
}

