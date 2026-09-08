"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { WorkspaceSwitcher, WorkspaceItem } from "./WorkspaceSwitcher";

interface MainNavigationProps {
  userEmail?: string;
  workspaces?: WorkspaceItem[];
  activeWorkspaceId?: string;
}

export default function MainNavigation({
  userEmail,
  workspaces = [],
  activeWorkspaceId,
}: MainNavigationProps) {
  const pathname = usePathname() || "";

  const isGettingStarted = pathname.startsWith("/dashboard/getting-started");
  const isIntegrations =
    pathname.startsWith("/dashboard/integrations") ||
    (pathname.includes("/dashboard/projects/") && pathname.endsWith("/integrations"));
  const isSettings =
    pathname.startsWith("/dashboard/settings") ||
    pathname.startsWith("/dashboard/team") ||
    pathname.startsWith("/dashboard/billing");
  const isSupport =
    pathname.startsWith("/dashboard/support") || pathname.startsWith("/docs");
  const isWebsites =
    !isGettingStarted && !isIntegrations && !isSettings && !isSupport;

  const navItems = [
    {
      label: "Getting Started",
      href: "/dashboard/getting-started",
      active: isGettingStarted,
      icon: "🚀",
    },
    {
      label: "Websites",
      href: "/dashboard",
      active: isWebsites,
      icon: "🌐",
    },
    {
      label: "Integrations",
      href: "/dashboard/integrations",
      active: isIntegrations,
      icon: "🔗",
    },
    {
      label: "Settings",
      href: "/dashboard/settings",
      active: isSettings,
      icon: "⚙️",
    },
    {
      label: "Support",
      href: "/dashboard/support",
      active: isSupport,
      icon: "💬",
    },
  ];

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.85rem 1.75rem",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        background: "rgba(18, 18, 26, 0.85)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Left: Brand & Navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
        <Link
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            textDecoration: "none",
            color: "var(--text-primary, #f0f0ff)",
            fontWeight: 700,
            fontSize: "1.1rem",
            letterSpacing: "-0.01em",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              background: "linear-gradient(135deg, #6c63ff 0%, #3ecfcf 100%)",
              borderRadius: "6px",
              fontSize: "0.9rem",
            }}
          >
            ⚡
          </span>
          <span>Sorget</span>
        </Link>

        {/* Main Nav Links */}
        <nav style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              id={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.4rem 0.85rem",
                borderRadius: "6px",
                fontSize: "0.875rem",
                fontWeight: item.active ? 600 : 500,
                color: item.active ? "#ffffff" : "var(--text-secondary, #94a3b8)",
                background: item.active
                  ? "rgba(108, 99, 255, 0.16)"
                  : "transparent",
                border: item.active
                  ? "1px solid rgba(108, 99, 255, 0.3)"
                  : "1px solid transparent",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontSize: "0.9rem" }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Right: Workspace Switcher, User Email, Logout */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        {workspaces.length > 0 && (
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
          />
        )}

        {userEmail && (
          <span
            id="nav-user-email"
            style={{
              fontSize: "0.8125rem",
              color: "var(--text-muted, rgba(240, 240, 255, 0.4))",
              maxWidth: "180px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={userEmail}
          >
            {userEmail}
          </span>
        )}

        <form action={logout}>
          <button
            id="logout-btn"
            type="submit"
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              color: "#f87171",
              padding: "0.35rem 0.75rem",
              borderRadius: "6px",
              fontSize: "0.8125rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Logout
          </button>
        </form>
      </div>
    </header>
  );
}
