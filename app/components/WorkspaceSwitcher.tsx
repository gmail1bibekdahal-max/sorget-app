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
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          padding: "0.4rem 0.75rem",
          borderRadius: "6px",
          color: "inherit",
          cursor: "pointer",
          fontSize: "0.875rem",
          fontWeight: 500,
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
            background: "rgba(99, 102, 241, 0.2)",
            color: "#818cf8",
            padding: "0.1rem 0.35rem",
            borderRadius: "4px",
          }}
        >
          {activeWorkspace.role}
        </span>
        <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>▼</span>
      </button>

      {isOpen && (
        <div
          id="workspace-dropdown"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: "0.5rem",
            background: "#1e293b",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            zIndex: 100,
            minWidth: "220px",
            padding: "0.5rem",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", padding: "0.25rem 0.5rem", fontWeight: 600 }}>
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
                padding: "0.5rem",
                borderRadius: "4px",
                border: "none",
                background: ws.id === activeWorkspace.id ? "rgba(99, 102, 241, 0.15)" : "transparent",
                color: ws.id === activeWorkspace.id ? "#818cf8" : "#f1f5f9",
                cursor: "pointer",
                textAlign: "left",
                fontSize: "0.875rem",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ws.name}</span>
              <span style={{ fontSize: "0.7rem", color: "#64748b" }}>{ws.role}</span>
            </button>
          ))}

          <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "0.5rem 0" }} />

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
              padding: "0.5rem",
              borderRadius: "4px",
              border: "none",
              background: "transparent",
              color: "#38bdf8",
              cursor: "pointer",
              fontSize: "0.8125rem",
              fontWeight: 500,
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
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="card"
            style={{
              background: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              padding: "1.5rem",
              maxWidth: "420px",
              width: "100%",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Create New Workspace</h3>
            <form action={createWorkspace}>
              <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                <label htmlFor="ws-name" style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
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
                  style={{ padding: "0.5rem 1rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: "0.5rem 1rem" }}
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