"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateTrackingId } from "@/lib/tracking-id";
import { getOrCreateDefaultWorkspace, healOrphanProjects } from "@/lib/workspaces";

export async function createProject(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const name = (formData.get("name") as string)?.trim();
  const website = (formData.get("website") as string)?.trim() || null;

  if (!name) {
    redirect("/dashboard/projects/new?error=" + encodeURIComponent("Project name is required."));
  }

  // Ensure user has a valid workspace
  const workspace = await getOrCreateDefaultWorkspace(
    supabase,
    user.id,
    user.email,
    user.user_metadata?.full_name
  );

  // Always generate tracking ID server-side using the canonical generator
  const trackingId = generateTrackingId();

  // Security: user_id MUST come from verified server session (user.id), NEVER trusted from client
  const { data: project, error: insertError } = await supabase
    .from("projects")
    .insert([
      {
        name,
        website,
        tracking_id: trackingId,
        user_id: user.id,
        workspace_id: workspace.id,
      },
    ])
    .select()
    .single();

  if (insertError) {
    console.error("[createProject] Error creating project:", insertError.message);
    redirect("/dashboard/projects/new?error=" + encodeURIComponent(insertError.message));
  }

  // Also heal any previous orphan projects for this user
  await healOrphanProjects(supabase, user.id, workspace.id);

  revalidatePath("/dashboard");
  redirect(`/dashboard/projects/${project.id}`);
}

export async function updateProject(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const projectId = (formData.get("project_id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const website = (formData.get("website") as string)?.trim() || null;

  if (!projectId) {
    redirect("/dashboard?error=" + encodeURIComponent("Invalid project."));
  }

  if (!name) {
    redirect(
      `/dashboard/projects/${projectId}?section=settings&error=` +
        encodeURIComponent("Project name is required.")
    );
  }

  // Verify ownership before updating
  const { data: existing, error: fetchError } = await supabase
    .from("projects")
    .select("id, user_id, tracking_id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) {
    redirect("/dashboard?error=" + encodeURIComponent("Project not found or access denied."));
  }

  // tracking_id is immutable — never update it
  const { error: updateError } = await supabase
    .from("projects")
    .update({ name, website })
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("[updateProject] Error:", updateError.message);
    redirect(
      `/dashboard/projects/${projectId}?section=settings&error=` +
        encodeURIComponent(updateError.message)
    );
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard");
  redirect(
    `/dashboard/projects/${projectId}?section=settings&success=` +
      encodeURIComponent("Project settings saved.")
  );
}

export async function deleteProject(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const projectId = (formData.get("project_id") as string)?.trim();

  if (!projectId) {
    redirect("/dashboard?error=" + encodeURIComponent("Invalid project."));
  }

  // Verify ownership before deleting
  const { data: existing, error: fetchError } = await supabase
    .from("projects")
    .select("id, user_id, name")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) {
    redirect("/dashboard?error=" + encodeURIComponent("Project not found or access denied."));
  }

  // Delete leads first (guard against missing cascade FK constraint)
  await supabase.from("leads").delete().eq("project_id", projectId);

  // Delete the project — .eq('user_id') prevents cross-user deletion even if RLS were disabled
  const { error: deleteError } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (deleteError) {
    console.error("[deleteProject] Error:", deleteError.message);
    redirect("/dashboard?error=" + encodeURIComponent("Failed to delete project."));
  }

}
