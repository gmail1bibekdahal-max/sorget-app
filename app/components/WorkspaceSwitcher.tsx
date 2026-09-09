"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWorkspace } from "@/app/actions/workspaces";

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface WorkspaceSwitcherProps {
  workspaces: WorkspaceItem[];
  activeWorkspaceId?: string;
}

export function WorkspaceSwitcher({ workspaces, activeWorkspaceId }: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || {
    id: "default",
    name: "My Workspace",
    slug: "default",
    role: "owner",
  };

  const handleSelectWorkspace = (wsId: string) => {
    setIsOpen(false);
    router.push(`/dashboard?workspace=${wsId}`);
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <button
        id="workspace-switcher-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          background: "#f3f4f6",
          border: "1px solid #e9eaeb",
          padding: "0.5rem 0.75rem",
          borderRadius: "8px",
          color: "#3A313C",
          cursor: "pointer",
          fontSize: "calc(.25rem * 4)",
          fontWeight: 600,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "140px" }}>
          {activeWorkspace.name}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div
          id="workspace-dropdown"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            width: "100%",
            background: "#ffffff",
            border: "1px solid var(--color-border, #e5e7eb)",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)",
            zIndex: 100,
            padding: "0.35rem",
          }}
        >
          <div style={{ fontSize: "0.6875rem", color: "var(--text-muted, #64748b)", padding: "0.25rem 0.5rem", fontWeight: 600 }}>
            Workspaces
          </div>
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              type="button"
              onClick={() => handleSelectWorkspace(ws.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "0.4rem 0.5rem",
                borderRadius: "4px",
                border: "none",
                background: ws.id === activeWorkspace.id ? "#f3f4f6" : "transparent",
                color: "var(--text-primary, #0f172a)",
                cursor: "pointer",
                textAlign: "left",
                fontSize: "0.8125rem",
                fontWeight: ws.id === activeWorkspace.id ? 600 : 400,
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ws.name}</span>
              <span style={{ fontSize: "0.6875rem", color: "var(--text-muted, #64748b)" }}>{ws.role}</span>
            </button>
          ))}

          <div style={{ height: "1px", background: "var(--color-border, #e5e7eb)", margin: "0.3rem 0" }} />

          <button
            type="button"
            id="create-workspace-btn"
            onClick={() => {
              setIsOpen(false);
              setShowCreateModal(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              width: "100%",
              padding: "0.4rem 0.5rem",
              borderRadius: "4px",
              border: "none",
              background: "transparent",
              color: "var(--sorget-brand, #BB0C68)",
              cursor: "pointer",
              fontSize: "0.8125rem",
              fontWeight: 500,
            }}
          >
            <span>+</span> Create workspace
          </button>
        </div>
      )}

      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="card"
            style={{
              background: "#ffffff",
              border: "1px solid var(--color-border, #e5e7eb)",
              borderRadius: "8px",
              padding: "1.75rem",
              maxWidth: "380px",
              width: "100%",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "0.35rem", fontSize: "1.125rem", color: "var(--text-primary, #0f172a)" }}>
              Create Workspace
            </h3>
            <p style={{ marginBottom: "1.25rem", fontSize: "0.8125rem", color: "var(--text-muted, #64748b)" }}>
              Add a separate workspace for another brand or client.
            </p>
            <form action={createWorkspace}>
              <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                <label htmlFor="ws-name" style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.8125rem", fontWeight: 500 }}>
                  Workspace Name
                </label>
                <input
                  id="ws-name"
                  name="name"
                  type="text"
                  placeholder="e.g. Acme Marketing"
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}