"use client";

import { useRouter } from "next/navigation";
import styles from "./Planning.module.css";

interface PlanItem {
  id: string;
  name: string;
  sites: string;
  leads: string;
  price: string;
  period: string;
  popular?: boolean;
}

const PLANS_LIST: PlanItem[] = [
  {
    id: "1-site",
    name: "1 Site",
    sites: "1 Website",
    leads: "100 leads / month",
    price: "$29",
    period: "per month",
  },
  {
    id: "5-sites",
    name: "5 Sites",
    sites: "5 Websites",
    leads: "1,000 leads / month",
    price: "$99",
    period: "per month",
    popular: true,
  },
  {
    id: "25-sites",
    name: "25 Sites",
    sites: "25 Websites",
    leads: "10,000 leads / month",
    price: "$299",
    period: "per month",
  },
];

interface PlanningClientProps {
  currentPlan?: string;
  returnTo?: string;
}

function normalizePlanId(raw: string): string {
  const p = raw.toLowerCase().replace(/_/g, "-");
  if (p === "lite" || p === "1-site" || p === "1_site") return "1-site";
  if (p === "pro" || p === "professional" || p === "5-sites" || p === "5_sites") return "5-sites";
  if (p === "25-sites" || p === "25_sites") return "25-sites";
  return p;
}

export default function PlanningClient({ currentPlan = "", returnTo = "" }: PlanningClientProps) {
  const router = useRouter();
  const normalizedCurrent = normalizePlanId(currentPlan);

  return (
    <>
      <div className={styles.plans}>
        {PLANS_LIST.map((plan) => {
          const isCurrent = normalizedCurrent === plan.id;
          const targetUrl = `/planning/${plan.id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;

          return (
            <div
              key={plan.id}
              className={`${styles.planCard} ${plan.popular ? styles.planCardPopular : ""}`}
              style={isCurrent ? { border: "2px solid #059669" } : undefined}
            >
              {isCurrent ? (
                <span className={styles.popularBadge} style={{ background: "#059669" }}>Active Plan</span>
              ) : plan.popular ? (
                <span className={styles.popularBadge}>Most Popular</span>
              ) : null}
              <div className={styles.planName}>{plan.name}</div>
              <div className={styles.planFeature} style={{ fontWeight: 600, color: "#3A313C" }}>{plan.sites}</div>
              <div className={styles.planFeature}>{plan.leads}</div>
              <div className={styles.planFeature} style={{ color: "#059669", fontWeight: 600 }}>
                14-day free trial
              </div>
              <div className={styles.planPrice}>
                {plan.price} <span>{plan.period}</span>
              </div>
              <button
                type="button"
                className={styles.btnSelect}
                onClick={() => router.push(targetUrl)}
                id={`select-plan-${plan.id}`}
                style={isCurrent ? { background: "#059669", cursor: "pointer" } : undefined}
              >
                {isCurrent ? "Current Plan (Manage)" : normalizedCurrent ? "Upgrade Plan" : "Select Plan"}
              </button>
            </div>
          );
        })}
      </div>

      <p className={styles.enterprise}>
        Need a custom website limit or enterprise attribution?{" "}
        <a href="mailto:hello@sorget.site?subject=Custom%20Plan%20Inquiry" id="custom-plan-link">
          Contact Us for a Custom Plan
        </a>
      </p>
    </>
  );
}
