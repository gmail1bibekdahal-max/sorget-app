import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * GET /api/projects/[projectId]/leads
 *
 * Returns leads for a given project (by tracking_id).
 * Uses service role key server-side to bypass RLS for API access.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  const rawUrl = process.env.SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  let supabaseUrl = rawUrl;
  try {
    supabaseUrl = new URL(rawUrl).origin;
  } catch {
    supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  }

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { success: false, error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  const supabase = createServiceClient(supabaseUrl, serviceKey);

  // Resolve tracking_id to project record
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, tracking_id")
    .eq("tracking_id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { success: false, error: "Project not found" },
      { status: 404 }
    );
  }

  // Fetch leads strictly filtered by the resolved project UUID
  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  if (leadsError) {
    return NextResponse.json(
      { success: false, error: "Failed to retrieve leads" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    project: { name: project.name, tracking_id: project.tracking_id },
    leads: leads ?? [],
  });
}
