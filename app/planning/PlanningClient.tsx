"use client";

import { useRouter } from "next/navigation";
import styles from "./Planning.module.css";

const PLANS = [
  { id: "lite",    name: "Lite",    leads: "100 leads per month",   price: "$29", period: "per month" },
  { id: "starter", name: "Starter", leads: "500 leads per month",   price: "$49", period: "per month" },
  { id: "pro",     name: "Pro",     leads: "1,000 leads per month", price: "$99", period: "per month" },
];

export default function PlanningClient() {
  const router = useRouter();

  return (
    <>
      <div className={styles.plans}>
        {PLANS.map((plan) => (
          <div key={plan.id} className={styles.planCard}>
            <div className={styles.planName}>{plan.name}</div>
            <div className={styles.planFeature}>1 Site</div>
            <div className={styles.planFeature}>{plan.leads}</div>
            <div className={styles.planPrice}>
              {plan.price} <span>{plan.period}</span>
            </div>
            <button className={styles.btnSelect} onClick={() => router.push(`/planning/checkout/${plan.id}`)}>
              Select Plan
            </button>
          </div>
        ))}
      </div>

      <p className={styles.enterprise}>
        Need more leads per month?{" "}
        <a href="mailto:hello@attributer.io">Try our Enterprise plan</a>
      </p>
    </>
  );
}
