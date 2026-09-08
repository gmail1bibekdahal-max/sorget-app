import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/projects/[projectId]
 * Returns project owned by authenticated user.
 *
 * PATCH /api/projects/[projectId]
 * Updates name/website. tracking_id is immutable.
 *
 * DELETE /api/projects/[projectId]
 * Deletes project (and its leads) owned by authenticated user.
 */

async function getAuthAndProject(projectId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { user: null, project: null, supabase };

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, website, tracking_id, user_id, created_at")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  return { user, project: projectError ? null : project, supabase };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const { user, project } = await getAuthAndProject(projectId);

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!project) {
    return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, project });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const { user, project, supabase } = await getAuthAndProject(projectId);

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!project) {
    return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : null;
  const website = typeof body.website === "string" ? body.website.trim() || null : null;

  if (!name) {
    return NextResponse.json({ success: false, error: "Project name is required" }, { status: 400 });
  }

  // tracking_id is immutable — never update it even if provided in body
  const { data: updated, error: updateError } = await supabase
    .from("projects")
    .update({ name, website })
    .eq("id", projectId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, project: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const { user, project, supabase } = await getAuthAndProject(projectId);

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!project) {
    return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
  }

  // Delete leads first (guard against missing cascade)
  await supabase.from("leads").delete().eq("project_id", projectId);

  // Delete project — .eq("user_id") prevents cross-user deletion
  const { error: deleteError } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Project deleted" });
}