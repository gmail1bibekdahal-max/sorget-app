"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateDefaultWorkspace } from "@/lib/workspaces";
import { PLANS, planKeyToDbPlanId, resolvePlanKey } from "@/lib/billing";

/**
 * Activate or Upgrade Plan / 14-Day Free Trial.
 * Associates or updates the plan for the user's workspace,
 * stores the valid plan_id and canonical slug, and redirects
 * to the user's primary project overview.
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

  const rawPlan = (formData.get("plan") as string)?.trim() || "1-site";
  const canonicalPlan = resolvePlanKey({ plan_id: rawPlan, razorpay_subscription_id: rawPlan });
  const dbPlanId = planKeyToDbPlanId(canonicalPlan);
  const returnTo = (formData.get("returnTo") as string)?.trim();

  const workspace = await getOrCreateDefaultWorkspace(
    supabase,
    user.id,
    user.email,
    user.user_metadata?.full_name
  );

  const admin = createAdminClient();
  const db = admin || supabase;

  // Check if subscription exists for workspace
  const { data: existingSub } = await db
    .from("subscriptions")
    .select("id, status, plan_id, razorpay_subscription_id")
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  if (existingSub) {
    // ALWAYS update plan_id and razorpay_subscription_id to the selected plan
    const updatePayload: Record<string, any> = {
      plan_id: dbPlanId,
      razorpay_subscription_id: canonicalPlan,
      updated_at: now.toISOString(),
    };

    // If subscription is not yet active or trialing, initialize trial timestamps
    if (existingSub.status !== "active" && existingSub.status !== "trialing") {
      updatePayload.status = "trialing";
      updatePayload.current_period_start = now.toISOString();
      updatePayload.current_period_end = trialEnd.toISOString();
    }

    const { error: updateError } = await db
      .from("subscriptions")
      .update(updatePayload)
      .eq("id", existingSub.id);

    if (updateError) {
      console.error("[activateFreeTrial] Update error:", updateError.message);
      throw new Error(`Failed to update subscription: ${updateError.message}`);
    }
  } else {
    // Insert new subscription record using valid DB columns
    const { error: insertError } = await db.from("subscriptions").insert([
      {
        workspace_id: workspace.id,
        plan_id: dbPlanId,
        razorpay_subscription_id: canonicalPlan,
        status: "trialing",
        current_period_start: now.toISOString(),
        current_period_end: trialEnd.toISOString(),
        cancel_at_period_end: false,
      },
    ]);

    if (insertError) {
      console.error("[activateFreeTrial] Insert error:", insertError.message);
      throw new Error(`Failed to create subscription: ${insertError.message}`);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects/new");
  revalidatePath("/dashboard/settings");
  revalidatePath("/planning");

  if (returnTo && returnTo.startsWith("/")) {
    redirect(returnTo);
  }

  // Find user's projects in this workspace
  const { data: projects } = await db
    .from("projects")
    .select("id")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: true });

  if (projects && projects.length > 0) {
    // Brand new or existing onboarding user: send directly to their project overview!
    redirect(`/dashboard/projects/${projects[0].id}`);
  } else {
    redirect("/onboarding");
  }
}
