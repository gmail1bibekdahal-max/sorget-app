import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sortProjectsCanonically } from "@/lib/projects";
import MainNavigation from "@/app/components/MainNavigation";
import styles from "./Page.module.css";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/login");
  }

  const [
    { data: memberRows },
    { data: rawProjects },
  ] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("role, workspaces(id, name, slug)")
      .eq("user_id", user.id),
    supabase
      .from("projects")
      .select("id, name, website, tracking_id, workspace_id, user_id, created_at")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
  ]);

  const userWorkspaces = (memberRows ?? [])
    .filter((r: any) => r.workspaces)
    .map((r: any) => ({
      id: r.workspaces.id,
      name: r.workspaces.name,
      slug: r.workspaces.slug,
      role: r.role,
    }));

  const projects = sortProjectsCanonically(rawProjects ?? []);

  return (
    <div className={styles.layout}>
      <MainNavigation
        userEmail={user.email}
        workspaces={userWorkspaces}
        projects={projects}
      />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
