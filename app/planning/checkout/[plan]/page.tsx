"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import styles from "../Checkout.module.css";

const PLAN_META: Record<string, { name: string; price: string }> = {
  lite:    { name: "Lite",    price: "$29/mo" },
  starter: { name: "Starter", price: "$49/mo" },
  pro:     { name: "Pro",     price: "$99/mo" },
};

function trialEndLabel() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const planId = (params?.plan as string) ?? "lite";
  const plan = PLAN_META[planId] ?? PLAN_META.lite;
  const trialEnd = trialEndLabel();

  const [payTab, setPayTab] = useState<"card" | "paypal">("card");
  const [showNoCard, setShowNoCard] = useState(false);

  const TRUST = [
    `Free until ${trialEnd}`,
    "Cancel anytime in just 1 click",
    "Change the card on file anytime",
    "Card details are stored securely",
  ];

  return (
    <div className={styles.page}>
      {/* Left: card form */}
      <div className={styles.formSide}>
        <div className={styles.card}>
          <h1 className={styles.title}>Enter card details</h1>
          <p className={styles.subtitle}>
            Enter your credit card to start your free trial of the {plan.name} plan
          </p>

          <div className={styles.payTabs}>
            <button
              className={`${styles.payTab} ${payTab === "paypal" ? styles.payTabActive : ""}`}
              onClick={() => setPayTab("paypal")}
            >
              PayPal
            </button>
            <button
              className={`${styles.payTab} ${payTab === "card" ? styles.payTabActive : ""}`}
              onClick={() => setPayTab("card")}
            >
              VISA / Card
            </button>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Card number</label>
            <input className={styles.fieldInput} placeholder="1234 1234 1234 1234" />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Expiration date</label>
              <input className={styles.fieldInput} placeholder="MM / YY" />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Security code (CVC)</label>
              <input className={styles.fieldInput} placeholder="123" />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Country</label>
            <select className={styles.fieldInput} defaultValue="IN">
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
              <option value="IN">India</option>
              <option value="CA">Canada</option>
              <option value="other">Other</option>
            </select>
          </div>

          <p className={styles.legalText}>
            By providing your card information, you allow Attributer Pty Ltd to charge your card
            for future payments in accordance with their terms.
          </p>

          <button className={styles.btnPrimary} onClick={() => router.push("/dashboard")}>
            Start 14 Day Free Trial
          </button>

          <p className={styles.noCardLink}>
            No credit card handy?{" "}
            <button onClick={() => setShowNoCard(true)}>Click here</button>
          </p>
        </div>
      </div>

      {/* Right: trust panel */}
      <div className={styles.trustSide}>
        <a href="/" className={styles.trustLogo}>
          <Image src="/logo.png" alt="Sorget" width={32} height={32} className={styles.trustLogoImg} priority />
          <span>Sorget</span>
        </a>

        <h2 className={styles.trustHeadline}>Start your 14-day free trial of the {plan.name} plan</h2>
        <p className={styles.trustSubtitle}>
          {plan.price} after your trial. No surprises.
        </p>

        <div className={styles.trustDivider} />

        <ul className={styles.trustList}>
          {TRUST.map((item) => (
            <li key={item}>
              <span className={styles.trustCheck}>✓</span>
              {item}
            </li>
          ))}
        </ul>

        <p className={styles.trustNote}>
          Your card won&apos;t be charged until your trial ends. We&apos;ll send you a reminder 3 days before.
        </p>
      </div>

      {/* No-card modal */}
      {showNoCard && (
        <div className={styles.overlay} onClick={() => setShowNoCard(false)}>
          <div className={styles.noCardModal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setShowNoCard(false)}>✕</button>
            <div className={styles.modalIcon}>📧</div>
            <h2 className={styles.noCardTitle}>No card? No problem.</h2>
            <p className={styles.noCardBody}>
              Start your 14-day free trial right now — no credit card needed.
              We&apos;ll remind you 3 days before it ends so you can add a card and keep everything running.
            </p>
            <button className={styles.btnPrimary} onClick={() => router.push("/dashboard")}>
              Start free trial
            </button>

          </div>
        </div>
      )}
    </div>
  );
}
