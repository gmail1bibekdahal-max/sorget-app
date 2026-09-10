"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { WorkspaceSwitcher, WorkspaceItem } from "./WorkspaceSwitcher";

export interface ProjectNavOption {
  id: string;
  name: string;
}

interface MainNavigationProps {
  userEmail?: string;
  workspaces?: WorkspaceItem[];
  activeWorkspaceId?: string;
  projects?: ProjectNavOption[];
  activeProjectId?: string;
  activeProjectName?: string;
  activeProjectHref?: string;
}

export default function MainNavigation({
  userEmail,
  workspaces = [],
  activeWorkspaceId,
  projects: initialProjects = [],
  activeProjectId: explicitActiveProjectId,
}: MainNavigationProps) {
  const pathname = usePathname() || "";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [projectList, setProjectList] = useState<ProjectNavOption[]>(initialProjects);
  const [manualExpanded, setManualExpanded] = useState<Record<string, boolean>>({});

  // Fetch projects from API if not provided in server props
  useEffect(() => {
    if (initialProjects && initialProjects.length > 0) {
      setProjectList(initialProjects);
      return;
    }

    let isMounted = true;
    fetch("/api/projects")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.projects) {
          setProjectList(data.projects);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [initialProjects]);

  // Determine current active project ID from URL
  const currentProjectId = useMemo(() => {
    if (explicitActiveProjectId) return explicitActiveProjectId;
    const match = pathname.match(/\/dashboard\/projects\/([^\/]+)/);
    return match ? match[1] : null;
  }, [pathname, explicitActiveProjectId]);

  // Expand state helper: automatically expand active project unless user toggled it
  const isExpanded = (projectId: string) => {
    if (manualExpanded[projectId] !== undefined) {
      return manualExpanded[projectId];
    }
    return projectId === currentProjectId;
  };

  const toggleProject = (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setManualExpanded((prev) => ({
      ...prev,
      [projectId]: !isExpanded(projectId),
    }));
  };

  // Route matchers
  const isGettingStarted = pathname.startsWith("/dashboard/getting-started");
  const isSettings =
    pathname.startsWith("/dashboard/settings") ||
    pathname.startsWith("/dashboard/team") ||
    pathname.startsWith("/dashboard/billing");
  const isSupport = pathname.startsWith("/dashboard/support") || pathname.startsWith("/docs");
  const isDashboardRoot = pathname === "/dashboard" || pathname === "/dashboard/";

  const bottomItems = [
    {
      label: "Settings",
      href: "/dashboard/settings",
      active: isSettings,
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
    {
      label: "Support",
      href: "/dashboard/support",
      active: isSupport,
      external: true,
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="dashboard-sidebar">
      {/* Mobile Topbar */}
      <div className="sidebar-mobile-header">
        <Link href="/dashboard" className="sidebar-brand-link">
          <div className="sidebar-logo-icon">
            <Image src="/logo.png" alt="Sorget Logo" width={22} height={22} priority />
          </div>
          <span className="sidebar-brand-name">Sorget</span>
        </Link>
        <button
          type="button"
          className="sidebar-mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Desktop Brand Section */}
      <div className="sidebar-desktop-brand">
        <Link href="/dashboard" className="sidebar-brand-link">
          <div className="sidebar-logo-icon">
            <Image src="/logo.png" alt="Sorget Logo" width={24} height={24} priority />
          </div>
          <span className="sidebar-brand-name">Sorget</span>
        </Link>

        {workspaces.length > 0 && (
          <div className="sidebar-workspace-container">
            <WorkspaceSwitcher workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} />
          </div>
        )}
      </div>

      {/* Navigation Links Body */}
      <div className={`sidebar-body ${mobileOpen ? "sidebar-body-open" : ""}`}>
        <nav className="sidebar-nav">
          {/* Websites Global Link */}
          <Link
            href="/dashboard"
            id="nav-websites-root"
            className={`sidebar-link ${isDashboardRoot ? "sidebar-link-active" : ""}`}
            onClick={() => setMobileOpen(false)}
          >
            <span className="sidebar-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
            </span>
            <span className="sidebar-label" style={{ fontWeight: 600 }}>Websites</span>
          </Link>

          {/* Expandable Website Rows */}
          {projectList.length > 0 && (
            <div style={{ marginTop: "0.25rem", display: "flex", flexDirection: "column", gap: "2px" }}>
              {projectList.map((project) => {
                const isCurrentProject = currentProjectId === project.id;
                const open = isExpanded(project.id);
                const basePath = `/dashboard/projects/${project.id}`;

                const isOverview =
                  isCurrentProject &&
                  pathname !== `${basePath}/integrations` &&
                  pathname !== `${basePath}/leads` &&
                  pathname !== `${basePath}/debugger`;
                const isIntegrations = isCurrentProject && pathname.startsWith(`${basePath}/integrations`);
                const isLeads = isCurrentProject && pathname.startsWith(`${basePath}/leads`);

                return (
                  <div key={project.id} className="sidebar-project-item">
                    {/* Website Row Header */}
                    <div
                      className={`sidebar-project-header ${
                        isCurrentProject ? "sidebar-project-header-active" : ""
                      }`}
                    >
                      <Link
                        href={basePath}
                        className="sidebar-project-name"
                        onClick={() => setMobileOpen(false)}
                        title={project.name}
                      >
                        <span style={{ fontSize: "14px", opacity: 0.8 }}>🌐</span>
                        <span>{project.name}</span>
                      </Link>

                      <button
                        type="button"
                        className="sidebar-chevron-btn"
                        onClick={(e) => toggleProject(project.id, e)}
                        aria-label={open ? "Collapse website menu" : "Expand website menu"}
                        title={open ? "Collapse" : "Expand"}
                      >
                        {open ? "▼" : "▶"}
                      </button>
                    </div>

                    {/* Expandable Sub-Navigation */}
                    {open && (
                      <div className="sidebar-subnav">
                        <Link
                          href={basePath}
                          className={`sidebar-sublink ${isOverview ? "sidebar-sublink-active" : ""}`}
                          onClick={() => setMobileOpen(false)}
                        >
                          Overview
                        </Link>
                        <Link
                          href={`${basePath}/integrations`}
                          className={`sidebar-sublink ${isIntegrations ? "sidebar-sublink-active" : ""}`}
                          onClick={() => setMobileOpen(false)}
                        >
                          Integrations
                        </Link>
                        <Link
                          href={`${basePath}/leads`}
                          className={`sidebar-sublink ${isLeads ? "sidebar-sublink-active" : ""}`}
                          onClick={() => setMobileOpen(false)}
                        >
                          Leads
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Getting Started Link */}
          <Link
            href="/dashboard/getting-started"
            id="nav-getting-started"
            className={`sidebar-link ${isGettingStarted ? "sidebar-link-active" : ""}`}
            style={{ marginTop: "0.5rem" }}
            onClick={() => setMobileOpen(false)}
          >
            <span className="sidebar-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
              </svg>
            </span>
            <span className="sidebar-label">Getting Started</span>
          </Link>
        </nav>

        {/* Bottom Actions */}
        <div className="sidebar-bottom">
          <nav className="sidebar-bottom-nav">
            {bottomItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                id={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={`sidebar-link ${item.active ? "sidebar-link-active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
                {item.external && (
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginLeft: "auto", opacity: 0.5 }}
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                )}
              </Link>
            ))}
          </nav>

          <div style={{ height: "1px", background: "var(--color-border-subtle, #f3f4f6)", margin: "0.25rem 0" }} />

          <form action={logout} className="sidebar-logout-form">
            <button
              type="submit"
              id="sidebar-logout-btn"
              className="sidebar-link sidebar-logout-btn"
            >
              <span className="sidebar-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </span>
              <span className="sidebar-label">Logout</span>
            </button>
          </form>

          {userEmail && (
            <div className="sidebar-user-info" title={userEmail}>
              <span className="sidebar-user-avatar">
                {userEmail.charAt(0).toUpperCase()}
              </span>
              <span className="sidebar-user-email">{userEmail}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
