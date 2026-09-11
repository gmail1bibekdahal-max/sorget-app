import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultWorkspace } from "@/lib/workspaces";
import { sortProjectsCanonically } from "@/lib/projects";

/**
 * GET /api/projects
 * Returns projects accessible to the authenticated user.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Please log in first." },
      { status: 401 }
    );
  }

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, website, tracking_id, workspace_id, created_at")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    projects: sortProjectsCanonically(projects ?? []),
  });
}

/**
 * POST /api/projects
 *
 * Creates a new project for the authenticated user.
 * user_id is determined strictly from the verified Supabase session token.
 * Client payload user_id is explicitly ignored to prevent spoofing.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Verify authenticated session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Please log in first." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : null;
  const website = typeof body.website === "string" ? body.website.trim() : null;
  let trackingId = typeof body.tracking_id === "string" ? body.tracking_id.trim() : null;

  if (!name) {
    return NextResponse.json(
      { success: false, error: "Project name is required" },
      { status: 400 }
    );
  }

  if (!trackingId) {
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    trackingId = `attr_${randomSuffix}`;
  }

  // Ensure workspace exists
  const workspace = await getOrCreateDefaultWorkspace(
    supabase,
    user.id,
    user.email,
    user.user_metadata?.full_name
  );

  // Security: user_id is ALWAYS set to user.id from verified session.
  // Any user_id sent in body is ignored.
  const { data: project, error: insertError } = await supabase
    .from("projects")
    .insert([
      {
        name,
        website,
        tracking_id: trackingId,
        user_id: user.id, // Enforce authenticated owner
        workspace_id: workspace.id,
      },
    ])
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { success: false, error: insertError.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, project }, { status: 201 });
}
