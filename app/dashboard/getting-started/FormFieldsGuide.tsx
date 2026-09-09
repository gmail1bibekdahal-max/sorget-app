"use client";

import { useState } from "react";
import CopyButton from "@/app/components/CopyButton";

interface HiddenField {
  name: string;
  label: string;
  example: string;
}

interface FormFieldsGuideProps {
  fields: HiddenField[];
}

const FORM_BUILDERS = [
  {
    id: "squarespace",
    name: "Squarespace Forms",
    hint: "Add 6 'Hidden' fields to your Squarespace form block. Set each field's title to the name below.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>
    ),
  },
  {
    id: "typeform",
    name: "Typeform",
    hint: "In Typeform, enable 'Hidden Fields' in the logic panel and define these 6 parameter names.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="5" width="16" height="14" rx="4"/>
        <path d="M10 9h4v6h-4z" fill="#ffffff"/>
      </svg>
    ),
  },
  {
    id: "jotform",
    name: "Jotform",
    hint: "Add 'Short Text' or 'Hidden' widgets to your Jotform and set their Unique Names to match below.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M6 18L18 6" stroke="#f97316" strokeWidth="4" strokeLinecap="round"/>
        <path d="M9 21L21 9" stroke="#0284c7" strokeWidth="4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "webflow",
    name: "Webflow",
    hint: "Add custom hidden input attributes or hidden inputs with name attribute matching below inside your Form block.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="#146ef5">
        <path d="M19.78 4h-3.64l-2.6 7.42L11 4H6.5l-3.3 16h3.64l1.63-7.9 2.5 7.9h3.46l2.5-7.9 1.63 7.9H22L19.78 4z"/>
      </svg>
    ),
  },
  {
    id: "other",
    name: "Other Forms",
    hint: "Add standard <input type=\"hidden\" name=\"[name]\" value=\"\"> fields inside your HTML <form> element.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
  },
];

export default function FormFieldsGuide({ fields }: FormFieldsGuideProps) {
  const [selectedBuilder, setSelectedBuilder] = useState<string>("other");
  const [activeTab, setActiveTab] = useState<"fields" | "html">("fields");

  const currentBuilder =
    FORM_BUILDERS.find((b) => b.id === selectedBuilder) || FORM_BUILDERS[0];

  const htmlSnippet = fields
    .map((f) => `<input type="hidden" name="${f.name}" value="">`)
    .join("\n");

  return (
    <div>
      {/* Builder selector tabs */}
      <div className="form-logos-row">
        {FORM_BUILDERS.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`form-logo-card ${selectedBuilder === b.id ? "selected" : ""}`}
            onClick={() => setSelectedBuilder(b.id)}
          >
            <div style={{ color: selectedBuilder === b.id ? "var(--sorget-pink)" : "#64748b" }}>
              {b.icon}
            </div>
            <span className="form-logo-title">{b.name}</span>
          </button>
        ))}
      </div>

      {/* Guide hint */}
      <div
        style={{
          marginTop: "1rem",
          marginBottom: "1rem",
          padding: "0.75rem 1rem",
          background: "#f8fafc",
          borderRadius: "8px",
          border: "1px solid var(--color-border)",
          fontSize: "0.85rem",
          color: "var(--text-secondary)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <span>💡 {currentBuilder.hint}</span>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={() => setActiveTab("fields")}
            style={{
              padding: "0.25rem 0.6rem",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: 600,
              border: "1px solid var(--color-border)",
              background: activeTab === "fields" ? "var(--sorget-pink)" : "#ffffff",
              color: activeTab === "fields" ? "#ffffff" : "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            Field List
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("html")}
            style={{
              padding: "0.25rem 0.6rem",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: 600,
              border: "1px solid var(--color-border)",
              background: activeTab === "html" ? "var(--sorget-pink)" : "#ffffff",
              color: activeTab === "html" ? "#ffffff" : "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            Raw HTML
          </button>
        </div>
      </div>

      {/* Content depending on tab */}
      {activeTab === "fields" ? (
        <div className="table-container" style={{ margin: 0 }}>
          <table className="leads-table">
            <thead>
              <tr>
                <th style={{ width: "200px" }}>Hidden Field Name</th>
                <th>Captures</th>
                <th>Example Value</th>
                <th style={{ width: "80px", textAlign: "right" }}>Copy</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => (
                <tr key={field.name}>
                  <td>
                    <code
                      style={{
                        background: "var(--sorget-pink-light, rgba(187, 12, 104, 0.08))",
                        color: "var(--sorget-pink, #BB0C68)",
                        border: "1px solid var(--sorget-pink-border, rgba(187, 12, 104, 0.25))",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "5px",
                        fontSize: "0.8125rem",
                        fontWeight: 700,
                        fontFamily: "'SF Mono', Consolas, monospace",
                      }}
                    >
                      {field.name}
                    </code>
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--sorget-dark, #3A313C)" }}>
                    {field.label}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                    {field.example}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <CopyButton text={field.name} label="Copy" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "10px",
            padding: "1rem 1.25rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
          }}
        >
          <pre
            style={{
              margin: 0,
              fontSize: "0.8125rem",
              color: "#38bdf8",
              fontFamily: "'SF Mono', Consolas, Monaco, monospace",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {htmlSnippet}
          </pre>
          <CopyButton text={htmlSnippet} label="Copy All HTML" />
        </div>
      )}
    </div>
  );
}
