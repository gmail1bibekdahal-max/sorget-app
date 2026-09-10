"use client";

import { useState } from "react";
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

const SINGLE_SITE_PLANS: PlanItem[] = [
  { id: "lite", name: "Lite", sites: "1 Site", leads: "100 leads/month", price: "$29", period: "per month" },
  { id: "starter", name: "Starter", sites: "1 Site", leads: "500 leads/month", price: "$49", period: "per month", popular: true },
  { id: "professional", name: "Professional", sites: "1 Site", leads: "1,000 leads/month", price: "$99", period: "per month" },
];

const MULTI_SITE_PLANS: PlanItem[] = [
  { id: "10-sites", name: "10 Sites", sites: "10 Sites", leads: "Full attribution analytics", price: "$199", period: "per month" },
  { id: "25-sites", name: "25 Sites", sites: "25 Sites", leads: "Full attribution analytics", price: "$299", period: "per month", popular: true },
  { id: "50-sites", name: "50 Sites", sites: "50 Sites", leads: "Full attribution analytics", price: "$399", period: "per month" },
];

export default function PlanningClient() {
  const router = useRouter();
  const [tab, setTab] = useState<"single" | "multi">("single");

  const plans = tab === "single" ? SINGLE_SITE_PLANS : MULTI_SITE_PLANS;

  return (
    <>
      <div className={styles.toggleGroup}>
        <button
          type="button"
          className={`${styles.toggleBtn} ${tab === "single" ? styles.toggleBtnActive : ""}`}
          onClick={() => setTab("single")}
        >
          Single Site
        </button>
        <button
          type="button"
          className={`${styles.toggleBtn} ${tab === "multi" ? styles.toggleBtnActive : ""}`}
          onClick={() => setTab("multi")}
        >
          Multiple Sites
        </button>
      </div>

      <div className={styles.plans}>
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`${styles.planCard} ${plan.popular ? styles.planCardPopular : ""}`}
          >
            {plan.popular && <span className={styles.popularBadge}>Most Popular</span>}
            <div className={styles.planName}>{plan.name}</div>
            <div className={styles.planFeature}>{plan.sites}</div>
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
              onClick={() => router.push(`/planning/${plan.id}`)}
              id={`select-plan-${plan.id}`}
            >
              Select Plan
            </button>
          </div>
        ))}
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
