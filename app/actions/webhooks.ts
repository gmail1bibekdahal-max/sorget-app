"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";

export async function createWebhook(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projectId = formData.get("project_id") as string;
  const url = formData.get("url") as string;
  const redirectUrl = (formData.get("redirect_url") as string) || "/dashboard/integrations";

  if (!projectId || !url) {
    redirect(`${redirectUrl}?error=${encodeURIComponent("Project ID and Webhook URL are required.")}`);
  }

  // Validate URL
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    redirect(`${redirectUrl}?error=${encodeURIComponent("Please enter a valid HTTP or HTTPS Webhook URL.")}`);
  }

  // Generate a random 32-byte hex secret
  const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;

  const { error } = await supabase.from("webhooks").insert({
    project_id: projectId,
    url,
    secret,
    events: ["lead.created"],
    status: "active",
  });

  if (error) {
    redirect(`${redirectUrl}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(redirectUrl);
  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath(`/dashboard/projects/${projectId}/integrations`);
  redirect(`${redirectUrl}?success=${encodeURIComponent("Webhook created successfully.")}`);
}

export async function deleteWebhook(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const webhookId = formData.get("webhook_id") as string;
  const projectId = formData.get("project_id") as string;
  const redirectUrl = (formData.get("redirect_url") as string) || "/dashboard/integrations";

  if (!webhookId) {
    redirect(`${redirectUrl}?error=${encodeURIComponent("Missing webhook ID.")}`);
  }

  const { error } = await supabase.from("webhooks").delete().eq("id", webhookId);

  if (error) {
    redirect(`${redirectUrl}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(redirectUrl);
  if (projectId) {
    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath(`/dashboard/projects/${projectId}/integrations`);
  }
  redirect(`${redirectUrl}?success=${encodeURIComponent("Webhook removed.")}`);
}
