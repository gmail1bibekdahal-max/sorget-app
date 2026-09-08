"use client";

import { useState } from "react";
import { deleteProject } from "@/app/actions/projects";

interface DeleteProjectConfirmProps {
  projectId: string;
  projectName: string;
}

export default function DeleteProjectConfirm({ projectId, projectName }: DeleteProjectConfirmProps) {
  const [confirmText, setConfirmText] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  if (!showConfirm) {
    return (
      <button
        type="button"
        id="delete-project-btn"
        className="btn btn-danger btn-sm"
        onClick={() => setShowConfirm(true)}
      >
        Delete Project
      </button>
    );
  }

  return (
    <div className="danger-confirm-box">
      <p style={{ marginBottom: "0.75rem", color: "var(--accent-red)", fontSize: "0.875rem" }}>
        This action is <strong>irreversible</strong>. All leads in this project will be permanently deleted.
      </p>
      <p style={{ marginBottom: "0.75rem", fontSize: "0.875rem" }}>
        Type <strong style={{ color: "var(--text-primary)" }}>{projectName}</strong> to confirm:
      </p>
      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder={`Type "${projectName}" to confirm`}
        style={{ marginBottom: "0.75rem" }}
        id="delete-confirm-input"
      />
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <form action={deleteProject}>
          <input type="hidden" name="project_id" value={projectId} />
          <button
            type="submit"
            id="delete-project-confirm-btn"
            className="btn btn-danger btn-sm"
            disabled={confirmText !== projectName}
          >
            Delete Permanently
          </button>
        </form>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => { setShowConfirm(false); setConfirmText(""); }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
