"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultWorkspace, healOrphanProjects } from "@/lib/workspaces";

export async function signup(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const fullName = (formData.get("name") as string)?.trim() || "";

  if (!email || !password) {
    redirect("/signup?error=" + encodeURIComponent("Email and password are required."));
  }

  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    redirect("/signup?error=" + encodeURIComponent(error.message));
  }

  // If user signed up:
  if (authData?.user) {
    try {
      await getOrCreateDefaultWorkspace(supabase, authData.user.id, email, fullName);
    } catch (wsError) {
      console.error("[signup] Workspace creation warning:", wsError);
    }

    if (authData.session) {
      revalidatePath("/", "layout");
      redirect("/onboarding");
    }
  }

  // On confirmation required:
  revalidatePath("/", "layout");
  redirect("/signup?success=1");
}

export async function login(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!email || !password) {
    redirect("/login?error=" + encodeURIComponent("Email and password are required."));
  }

  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !authData?.user) {
    redirect("/login?error=" + encodeURIComponent(error?.message || "Invalid credentials"));
  }

  // Ensure authenticated user always belongs to a workspace and heal any orphan projects
  try {
    const ws = await getOrCreateDefaultWorkspace(supabase, authData.user.id, authData.user.email);
    await healOrphanProjects(supabase, authData.user.id, ws.id);
  } catch (wsErr) {
    console.error("[login] Workspace check error:", wsErr);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function requestPasswordReset(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();

  if (!email) {
    redirect("/forgot-password?error=" + encodeURIComponent("Email is required."));
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });

  if (error) {
    redirect("/forgot-password?error=" + encodeURIComponent(error.message));
  }

  redirect("/forgot-password?success=1");
}

export async function updatePassword(formData: FormData) {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || password.length < 6) {
    redirect("/reset-password?error=" + encodeURIComponent("Password must be at least 6 characters."));
  }

  if (password !== confirmPassword) {
    redirect("/reset-password?error=" + encodeURIComponent("Passwords do not match."));
  }

  const supabase = await createClient();

  // Verify that an authenticated recovery session exists
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/forgot-password?error=" + encodeURIComponent("Session expired or invalid. Please request a new reset link."));
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect("/reset-password?error=" + encodeURIComponent(error.message));
  }

  // After successful password update: sign out recovery session and redirect to /login
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login?notice=" + encodeURIComponent("Password updated successfully. Please sign in with your new password."));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

