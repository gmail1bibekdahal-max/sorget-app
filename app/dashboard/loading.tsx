import styles from "./Page.module.css";

export default function DashboardLoading() {
  return (
    <div style={{ animation: "fadeIn 0.15s ease" }}>
      <div className={styles.pageHeader}>
        <div
          style={{
            height: "32px",
            width: "240px",
            background: "linear-gradient(90deg, #f0f1f3 25%, #e4e6eb 50%, #f0f1f3 75%)",
            backgroundSize: "200% 100%",
            animation: "skeletonPulse 1.5s infinite ease-in-out",
            borderRadius: "6px",
            marginBottom: "10px",
          }}
        />
        <div
          style={{
            height: "16px",
            width: "360px",
            background: "linear-gradient(90deg, #f0f1f3 25%, #e4e6eb 50%, #f0f1f3 75%)",
            backgroundSize: "200% 100%",
            animation: "skeletonPulse 1.5s infinite ease-in-out",
            borderRadius: "4px",
          }}
        />
      </div>

      <div className={styles.cards}>
        <div
          className={styles.card}
          style={{
            minHeight: "180px",
            background: "linear-gradient(90deg, #fafbfc 25%, #f2f4f7 50%, #fafbfc 75%)",
            backgroundSize: "200% 100%",
            animation: "skeletonPulse 1.5s infinite ease-in-out",
            border: "1px solid #e9eaeb",
          }}
        />
        <div
          className={styles.card}
          style={{
            minHeight: "220px",
            background: "linear-gradient(90deg, #fafbfc 25%, #f2f4f7 50%, #fafbfc 75%)",
            backgroundSize: "200% 100%",
            animation: "skeletonPulse 1.5s infinite ease-in-out",
            border: "1px solid #e9eaeb",
          }}
        />
      </div>

      <style>{`
        @keyframes skeletonPulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
