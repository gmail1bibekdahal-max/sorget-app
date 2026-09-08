"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createWorkspace(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    redirect("/dashboard?error=" + encodeURIComponent("Workspace name is required."));
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Math.random().toString(36).substring(2, 6);

  const admin = createAdminClient();
  const { data: ws, error: wsError } = await admin
    .from("workspaces")
    .insert([{ name, slug }])
    .select()
    .single();

  if (wsError || !ws) {
    console.error("[createWorkspace] Error:", wsError?.message);
    redirect("/dashboard?error=" + encodeURIComponent(wsError?.message || "Failed to create workspace."));
  }

  const { error: memberError } = await admin.from("workspace_members").insert([
    { workspace_id: ws.id, user_id: user.id, role: "owner" },
  ]);

  if (memberError) {
    console.error("[createWorkspace] Member error:", memberError.message);
    redirect("/dashboard?error=" + encodeURIComponent(memberError.message || "Failed to join workspace."));
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?workspace=${ws.id}&success=` + encodeURIComponent(`Workspace "${name}" created.`));
}

export async function updateWorkspace(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const workspaceId = (formData.get("workspace_id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();

  if (!workspaceId || !name) {
    redirect("/dashboard?error=" + encodeURIComponent("Workspace ID and name are required."));
  }

  // Verify ownership / admin role
  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!member || !["owner", "admin"].includes(member.role)) {
    redirect("/dashboard?error=" + encodeURIComponent("Access denied: You must be an owner or admin."));
  }

  const { error: updateError } = await supabase
    .from("workspaces")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", workspaceId);

  if (updateError) {
    redirect("/dashboard?error=" + encodeURIComponent(updateError.message));
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?workspace=" + workspaceId + "&success=" + encodeURIComponent("Workspace settings saved."));
}

export async function deleteWorkspace(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const workspaceId = (formData.get("workspace_id") as string)?.trim();
  if (!workspaceId) {
    redirect("/dashboard?error=" + encodeURIComponent("Invalid workspace."));
  }

  // Only owner can delete workspace
  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!member || member.role !== "owner") {
    redirect("/dashboard?error=" + encodeURIComponent("Only the workspace owner can delete this workspace."));
  }

  const { error: deleteError } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId);

  if (deleteError) {
    redirect("/dashboard?error=" + encodeURIComponent(deleteError.message));
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?notice=" + encodeURIComponent("Workspace deleted."));
}