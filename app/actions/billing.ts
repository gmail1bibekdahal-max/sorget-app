"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultWorkspace } from "@/lib/workspaces";

/**
 * Activate 14-Day Free Trial.
 * Associates the trial with user's workspace, stores timestamps, and redirects to website Overview.
 */
export async function activateFreeTrial(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const rawPlan = (formData.get("plan") as string)?.trim() || "starter";
  const plan = rawPlan.toLowerCase().replace(/\s+/g, "-");

  const workspace = await getOrCreateDefaultWorkspace(
    supabase,
    user.id,
    user.email,
    user.user_metadata?.full_name
  );

  // Check if subscription or trial already exists for workspace (idempotent)
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("id, status, trial_end, plan")
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  if (existingSub) {
    // If not already active or trialing, activate trial
    if (existingSub.status !== "active" && existingSub.status !== "trialing") {
      await supabase
        .from("subscriptions")
        .update({
          plan,
          status: "trialing",
          provider: "paddle",
          trial_start: now.toISOString(),
          trial_end: trialEnd.toISOString(),
          current_period_start: now.toISOString(),
          current_period_end: trialEnd.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", existingSub.id);
    }
  } else {
    // Insert new subscription record
    const { error: insertError } = await supabase.from("subscriptions").insert([
      {
        workspace_id: workspace.id,
        plan,
        provider: "paddle",
        status: "trialing",
        trial_start: now.toISOString(),
        trial_end: trialEnd.toISOString(),
        current_period_start: now.toISOString(),
        current_period_end: trialEnd.toISOString(),
      },
    ]);

    if (insertError) {
      console.error("[activateFreeTrial] Insert error:", insertError.message);
    }
  }

  // Find user's first project in this workspace
  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: true })
    .limit(1);

  revalidatePath("/dashboard");

  if (projects && projects.length > 0) {
    // Target User Flow: Redirect to Website Overview (/dashboard/projects/[projectId])
    redirect(`/dashboard/projects/${projects[0].id}`);
  } else {
    // If onboarding wasn't completed, send to onboarding
    redirect("/onboarding");
  }
}
