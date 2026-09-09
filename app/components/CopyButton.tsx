"use client";

import { useState } from "react";

interface CopyButtonProps {
  text: string;
  label?: string;
  id?: string;
  className?: string;
}

const CopyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function CopyButton({ text, label, id, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const iconOnly = !label;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={className || "btn btn-secondary btn-sm"}
      id={id || "copy-tracking-code-btn"}
      style={iconOnly ? { padding: "0.35rem", height: "32px", width: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" } : { padding: "0.25rem 0.6rem", fontSize: "0.75rem", height: "28px" }}
      title={copied ? "Copied!" : "Copy"}
    >
      {copied ? <CheckIcon /> : (iconOnly ? <CopyIcon /> : label)}
    </button>
  );
}
