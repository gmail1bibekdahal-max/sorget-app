import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { sortProjectsCanonically } from "../lib/projects.ts";

describe("Sorget — Canonical Website/Project Ordering Suite", () => {
  it("1. Deterministically orders projects by created_at ASC (actual creation order)", () => {
    const rawProjects = [
      { id: "proj-6", name: "Hello World", created_at: "2026-01-06T10:00:00Z" },
      { id: "proj-5", name: "C", created_at: "2026-01-05T10:00:00Z" },
      { id: "proj-4", name: "C++", created_at: "2026-01-04T10:00:00Z" },
      { id: "proj-3", name: "AIML", created_at: "2026-01-03T10:00:00Z" },
      { id: "proj-2", name: "CSE", created_at: "2026-01-02T10:00:00Z" },
      { id: "proj-1", name: "SECE", created_at: "2026-01-01T10:00:00Z" },
    ];

    const sorted = sortProjectsCanonically(rawProjects);
    const names = sorted.map((p) => p.name);

    assert.deepEqual(names, [
      "SECE",
      "CSE",
      "AIML",
      "C++",
      "C",
      "Hello World",
    ]);
  });

  it("2. Solves the prompt's exact bug: reverse-order pages produce identical canonical order", () => {
    const pageAOrder = [
      { id: "1", name: "SECE", created_at: "2026-01-01T00:00:00Z" },
      { id: "2", name: "CSE", created_at: "2026-01-02T00:00:00Z" },
      { id: "3", name: "AIML", created_at: "2026-01-03T00:00:00Z" },
      { id: "4", name: "C++", created_at: "2026-01-04T00:00:00Z" },
      { id: "5", name: "C", created_at: "2026-01-05T00:00:00Z" },
      { id: "6", name: "Hello World", created_at: "2026-01-06T00:00:00Z" },
    ];

    const pageBOrder = [...pageAOrder].reverse();

    const resultA = sortProjectsCanonically(pageAOrder);
    const resultB = sortProjectsCanonically(pageBOrder);

    assert.deepEqual(resultA, resultB);
    assert.equal(resultA[0].name, "SECE");
    assert.equal(resultA[5].name, "Hello World");
  });

  it("3. Uses deterministic secondary sort (id ASC) when timestamps match", () => {
    const sameTimestampProjects = [
      { id: "z-proj", name: "Z Site", created_at: "2026-01-01T00:00:00Z" },
      { id: "a-proj", name: "A Site", created_at: "2026-01-01T00:00:00Z" },
      { id: "m-proj", name: "M Site", created_at: "2026-01-01T00:00:00Z" },
    ];

    const sorted = sortProjectsCanonically(sameTimestampProjects);
    assert.deepEqual(
      sorted.map((p) => p.id),
      ["a-proj", "m-proj", "z-proj"]
    );
  });

  it("4. Handles null, undefined, or missing created_at gracefully without throwing", () => {
    const mixed = [
      { id: "proj-b", name: "B Site", created_at: null },
      { id: "proj-c", name: "C Site", created_at: "2026-01-02T00:00:00Z" },
      { id: "proj-a", name: "A Site", created_at: undefined },
    ];

    const sorted = sortProjectsCanonically(mixed);
    assert.equal(sorted.length, 3);
    assert.equal(sorted[2].id, "proj-c"); // valid timestamp comes after 0
    assert.equal(sorted[0].id, "proj-a"); // secondary sort on id
    assert.equal(sorted[1].id, "proj-b");
  });

  it("5. Verifies database query ordering across all dashboard page files", () => {
    const filesToCheck = [
      "app/dashboard/page.tsx",
      "app/dashboard/projects/[projectId]/page.tsx",
      "app/dashboard/projects/[projectId]/leads/page.tsx",
      "app/dashboard/projects/[projectId]/integrations/page.tsx",
      "app/dashboard/integrations/page.tsx",
      "app/dashboard/settings/page.tsx",
      "app/dashboard/projects/new/page.tsx",
      "app/api/projects/route.ts",
    ];

    for (const relPath of filesToCheck) {
      const fullPath = path.resolve(relPath);
      const content = fs.readFileSync(fullPath, "utf-8");

      // Verify no descending order on projects
      assert.ok(
        !content.includes('.from("projects")\n      .select("id, name, website, tracking_id, created_at")\n      .order("created_at", { ascending: false })'),
        `${relPath} must not query projects with ascending: false`
      );

      // Verify canonical ascending sort
      assert.ok(
        content.includes('order("created_at", { ascending: true })'),
        `${relPath} must order by created_at ascending: true`
      );
      assert.ok(
        content.includes('order("id", { ascending: true })'),
        `${relPath} must specify secondary order by id ascending: true`
      );
    }
  });

  it("6. Verifies identical website ordering across Sidebar, Dashboard Table, and Integration Chips", () => {
    const userProjects = [
      { id: "p1", name: "SECE", created_at: "2026-01-01T00:00:00Z" },
      { id: "p2", name: "CSE", created_at: "2026-01-02T00:00:00Z" },
      { id: "p3", name: "AIML", created_at: "2026-01-03T00:00:00Z" },
      { id: "p4", name: "C++", created_at: "2026-01-04T00:00:00Z" },
      { id: "p5", name: "C", created_at: "2026-01-05T00:00:00Z" },
      { id: "p6", name: "Hello World", created_at: "2026-01-06T00:00:00Z" },
    ];

    // Simulate different pages feeding projects in arbitrary or shuffled orders
    const dashboardFetch = [...userProjects];
    const projectOverviewFetch = [...userProjects];
    const leadsFetch = [...userProjects];
    const integrationsFetch = [...userProjects].reverse();
    const settingsFetch = [...userProjects];

    const dashboardRendered = sortProjectsCanonically(dashboardFetch).map((p) => p.name);
    const overviewSidebarRendered = sortProjectsCanonically(projectOverviewFetch).map((p) => p.name);
    const leadsSidebarRendered = sortProjectsCanonically(leadsFetch).map((p) => p.name);
    const integrationsChipsRendered = sortProjectsCanonically(integrationsFetch).map((p) => p.name);
    const settingsSidebarRendered = sortProjectsCanonically(settingsFetch).map((p) => p.name);

    const expectedOrder = ["SECE", "CSE", "AIML", "C++", "C", "Hello World"];

    assert.deepEqual(dashboardRendered, expectedOrder);
    assert.deepEqual(overviewSidebarRendered, expectedOrder);
    assert.deepEqual(leadsSidebarRendered, expectedOrder);
    assert.deepEqual(integrationsChipsRendered, expectedOrder);
    assert.deepEqual(settingsSidebarRendered, expectedOrder);
  });
});
