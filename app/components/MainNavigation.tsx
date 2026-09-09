"use client";

import Link from "next/link";
import Image from "next/image";
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
        padding: "0.85rem 2rem",
        borderBottom: "1px solid var(--color-border, #e2e8f0)",
        background: "#ffffff",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Left: Brand & Navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: "2.25rem" }}>
        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
            color: "var(--sorget-dark, #3A313C)",
            fontWeight: 800,
            fontSize: "1.35rem",
            letterSpacing: "-0.5px",
          }}
        >
          <Image
            src="/logo.png"
            alt="Sorget Logo"
            width={30}
            height={30}
            style={{ height: "30px", width: "auto", objectFit: "contain" }}
            priority
          />
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
                padding: "0.45rem 0.85rem",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: item.active ? 700 : 600,
                color: item.active
                  ? "var(--sorget-pink, #BB0C68)"
                  : "var(--sorget-dark, #3A313C)",
                background: item.active
                  ? "var(--sorget-pink-light, rgba(187, 12, 104, 0.08))"
                  : "transparent",
                border: item.active
                  ? "1px solid var(--sorget-pink-border, rgba(187, 12, 104, 0.25))"
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
              color: "var(--text-muted, #64748b)",
              fontWeight: 500,
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
              background: "#fff5f5",
              border: "1px solid #fed7d7",
              color: "#e53e3e",
              padding: "0.4rem 0.85rem",
              borderRadius: "8px",
              fontSize: "0.8125rem",
              fontWeight: 600,
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
