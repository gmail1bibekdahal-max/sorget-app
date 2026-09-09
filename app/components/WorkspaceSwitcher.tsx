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
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        id="workspace-switcher-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "#ffffff",
          border: "1.5px solid var(--color-border, #e2e8f0)",
          padding: "0.4rem 0.75rem",
          borderRadius: "8px",
          color: "var(--sorget-dark, #3A313C)",
          cursor: "pointer",
          fontSize: "0.875rem",
          fontWeight: 600,
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <span style={{ fontSize: "1rem" }}>🏢</span>
        <span style={{ maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {activeWorkspace.name}
        </span>
        <span
          style={{
            fontSize: "0.7rem",
            textTransform: "uppercase",
            background: "var(--sorget-pink-light, rgba(187, 12, 104, 0.08))",
            color: "var(--sorget-pink, #BB0C68)",
            border: "1px solid var(--sorget-pink-border, rgba(187, 12, 104, 0.25))",
            padding: "0.1rem 0.4rem",
            borderRadius: "4px",
            fontWeight: 700,
          }}
        >
          {activeWorkspace.role}
        </span>
        <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>▼</span>
      </button>

      {isOpen && (
        <div
          id="workspace-dropdown"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: "0.5rem",
            background: "#ffffff",
            border: "1px solid var(--color-border, #e2e8f0)",
            borderRadius: "10px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
            zIndex: 100,
            minWidth: "230px",
            padding: "0.5rem",
          }}
        >
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted, #64748b)", padding: "0.35rem 0.5rem", fontWeight: 700, letterSpacing: "0.05em" }}>
            WORKSPACES
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
                padding: "0.5rem 0.65rem",
                borderRadius: "6px",
                border: "none",
                background: ws.id === activeWorkspace.id ? "var(--sorget-pink-light, rgba(187, 12, 104, 0.08))" : "transparent",
                color: ws.id === activeWorkspace.id ? "var(--sorget-pink, #BB0C68)" : "var(--sorget-dark, #3A313C)",
                cursor: "pointer",
                textAlign: "left",
                fontSize: "0.875rem",
                fontWeight: ws.id === activeWorkspace.id ? 700 : 500,
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ws.name}</span>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted, #64748b)" }}>{ws.role}</span>
            </button>
          ))}

          <div style={{ height: "1px", background: "var(--color-border, #e2e8f0)", margin: "0.4rem 0" }} />

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
              gap: "0.5rem",
              width: "100%",
              padding: "0.5rem 0.65rem",
              borderRadius: "6px",
              border: "none",
              background: "transparent",
              color: "var(--sorget-pink, #BB0C68)",
              cursor: "pointer",
              fontSize: "0.8125rem",
              fontWeight: 600,
            }}
          >
            <span>+</span> Create New Workspace
          </button>
        </div>
      )}

      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="card"
            style={{
              background: "#ffffff",
              border: "1px solid var(--color-border, #e2e8f0)",
              borderRadius: "16px",
              padding: "2rem",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.12)",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.25rem", color: "var(--sorget-dark, #3A313C)" }}>
              Create New Workspace
            </h3>
            <p style={{ marginBottom: "1.5rem", fontSize: "0.875rem", color: "var(--text-muted, #64748b)" }}>
              Add a separate workspace for another brand or client.
            </p>
            <form action={createWorkspace}>
              <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                <label htmlFor="ws-name" style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.8125rem", fontWeight: 600 }}>
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                  style={{ width: "auto", padding: "0.5rem 1rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: "auto", padding: "0.5rem 1.25rem" }}
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