import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UserWorkspace {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member" | "viewer";
}

/**
 * Retrieves the user's primary/active workspace or creates a default one if none exists.
 * Guaranteed never to create duplicate workspaces for an existing user.
 * Uses admin client to bypass RLS when provisioning workspaces and initial ownership.
 */
export async function getOrCreateDefaultWorkspace(
  supabase: SupabaseClient,
  userId: string,
  userEmail?: string | null,
  fullName?: string | null
): Promise<UserWorkspace> {
  const admin = createAdminClient();
  const db = admin || supabase;

  // 1. Check existing workspace memberships
  const { data: memberRows } = await db
    .from("workspace_members")
    .select("role, workspaces(id, name, slug)")
    .eq("user_id", userId);

  const existingWorkspaces: UserWorkspace[] = (memberRows ?? [])
    .filter((r: any) => r.workspaces)
    .map((r: any) => ({
      id: r.workspaces.id,
      name: r.workspaces.name,
      slug: r.workspaces.slug,
      role: r.role,
    }));

  if (existingWorkspaces.length > 0) {
    // Prefer owner or admin role
    const primary =
      existingWorkspaces.find((w) => w.role === "owner") ||
      existingWorkspaces.find((w) => w.role === "admin") ||
      existingWorkspaces[0];
    return primary;
  }

  // 2. Create default workspace if none exists
  const cleanEmailName = userEmail ? userEmail.split("@")[0] : "user";
  const baseName = fullName?.trim() || "Main Workspace";
  const slug =
    (fullName || cleanEmailName).toLowerCase().replace(/[^a-z0-9]/g, "-") +
    "-" +
    Math.random().toString(36).substring(2, 6);

  const { data: newWs, error: wsErr } = await db
    .from("workspaces")
    .insert([{ name: baseName, slug }])
    .select()
    .single();

  if (wsErr || !newWs) {
    throw new Error(wsErr?.message || "Failed to create default workspace");
  }

  const { error: memberErr } = await db.from("workspace_members").insert([
    { workspace_id: newWs.id, user_id: userId, role: "owner" },
  ]);

  if (memberErr) {
    throw new Error(memberErr.message || "Failed to assign workspace owner");
  }

  return {
    id: newWs.id,
    name: newWs.name,
    slug: newWs.slug,
    role: "owner",
  };
}

/**
 * Ensures any projects owned by this user without a workspace_id are assigned to their workspace.
 */
export async function healOrphanProjects(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<number> {
  const admin = createAdminClient();
  const db = admin || supabase;

  const { data: orphans } = await db
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .is("workspace_id", null);

  if (orphans && orphans.length > 0) {
    const ids = orphans.map((o) => o.id);
    await db
      .from("projects")
      .update({ workspace_id: workspaceId })
      .in("id", ids);
    return ids.length;
  }

  return 0;
}
