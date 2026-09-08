import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let workspace_id: string | null = null;
  const contentType = req.headers.get("content-type") || "";
  const isForm = contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");

  if (isForm) {
    try {
      const formData = await req.formData();
      workspace_id = (formData.get("workspace_id") as string) || null;
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }
  } else {
    try {
      const body = await req.json();
      workspace_id = body.workspace_id || null;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
  }

  if (!workspace_id) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  // Tenant isolation: verify caller is owner or admin of workspace_id
  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspace_id)
    .eq("user_id", user.id)
    .single();

  if (!member || !["owner", "admin"].includes(member.role)) {
    return NextResponse.json(
      { error: "Forbidden: You must be a workspace owner or admin to disconnect CRM" },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("crm_connections")
    .update({ is_active: false, access_token: null, refresh_token: null, updated_at: new Date().toISOString() })
    .eq("workspace_id", workspace_id)
    .eq("provider", "hubspot");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (isForm) {
    const referer = req.headers.get("referer");
    const targetUrl = referer ? new URL(referer) : new URL("/dashboard", req.url);
    targetUrl.searchParams.set("notice", "HubSpot disconnected successfully");
    return NextResponse.redirect(targetUrl);
  }

  return NextResponse.json({ success: true });
}