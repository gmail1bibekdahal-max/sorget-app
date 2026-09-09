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
  },
  {
    id: "typeform",
    name: "Typeform",
    hint: "In Typeform, enable 'Hidden Fields' in the logic panel and define these 6 parameter names.",
  },
  {
    id: "jotform",
    name: "Jotform",
    hint: "Add 'Short Text' or 'Hidden' widgets to your Jotform and set their Unique Names to match below.",
  },
  {
    id: "webflow",
    name: "Webflow",
    hint: "Add hidden input fields inside your Webflow form block matching the names below.",
  },
  {
    id: "other",
    name: "Other Forms",
    hint: "Add standard <input type=\"hidden\" name=\"[name]\" value=\"\"> fields inside your HTML <form> element.",
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
      {/* Form builder selector */}
      <div className="form-logos-row">
        {FORM_BUILDERS.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`form-logo-card ${selectedBuilder === b.id ? "selected" : ""}`}
            onClick={() => setSelectedBuilder(b.id)}
          >
            <span className="form-logo-title">{b.name}</span>
          </button>
        ))}
      </div>

      {/* Guide hint and view toggle */}
      <div
        style={{
          marginTop: "0.75rem",
          marginBottom: "0.75rem",
          padding: "0.5rem 0.75rem",
          background: "#f9fafb",
          borderRadius: "6px",
          border: "1px solid var(--color-border)",
          fontSize: "calc(.25rem * 4)",
          color: "#717680",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <span>💡 {currentBuilder.hint}</span>
        <div style={{ display: "flex", gap: "0.35rem" }}>
          <button
            type="button"
            onClick={() => setActiveTab("fields")}
            style={{
              padding: "0.2rem 0.5rem",
              borderRadius: "4px",
              fontSize: "calc(.25rem * 4)",
              fontWeight: activeTab === "fields" ? 600 : 400,
              border: "1px solid var(--color-border)",
              background: activeTab === "fields" ? "#0f172a" : "#ffffff",
              color: activeTab === "fields" ? "#ffffff" : "#717680",
              cursor: "pointer",
            }}
          >
            Field List
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("html")}
            style={{
              padding: "0.2rem 0.5rem",
              borderRadius: "4px",
              fontSize: "calc(.25rem * 4)",
              fontWeight: activeTab === "html" ? 600 : 400,
              border: "1px solid var(--color-border)",
              background: activeTab === "html" ? "#0f172a" : "#ffffff",
              color: activeTab === "html" ? "#ffffff" : "#717680",
              cursor: "pointer",
            }}
          >
            Raw HTML
          </button>
        </div>
      </div>

      {/* Table / HTML Code */}
      {activeTab === "fields" ? (
        <div className="table-container" style={{ margin: 0 }}>
          <table className="leads-table">
            <thead>
              <tr>
                <th style={{ width: "25%" }}>Hidden Field Name</th>
                <th style={{ width: "25%" }}>Captures</th>
                <th style={{ width: "35%" }}>Example Value</th>
                <th style={{ width: "15%", textAlign: "right" }}>Copy</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => (
                <tr key={field.name}>
                  <td>
                    <code
                      style={{
                        background: "#f3f4f6",
                        color: "var(--text-primary)",
                        border: "1px solid var(--color-border)",
                        padding: "0.15rem 0.4rem",
                        borderRadius: "4px",
                      fontSize: "calc(.25rem * 4)",
                        fontWeight: 600,
                      }}
                    >
                      {field.name}
                    </code>
                  </td>
                  <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                    {field.label}
                  </td>
                  <td style={{ color: "#717680", fontSize: "calc(.25rem * 4)" }}>
                    {field.example}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <CopyButton text={field.name} label="Copy" id={`copy-field-${field.name}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          style={{
            background: "#0f172a",
            borderRadius: "6px",
            padding: "0.85rem 1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
          }}
        >
          <pre
            style={{
              margin: 0,
              fontSize: "calc(.25rem * 4)",
              color: "#717680",
              fontFamily: "ui-monospace, monospace",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              lineHeight: 1.5,
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
