import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership / access via project query (enforced by RLS as well)
  const { data: project, error: projError } = await supabase
    .from("projects")
    .select("id, name, tracking_id")
    .eq("id", projectId)
    .single();

  if (projError || !project) {
    return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
  }

  const searchParams = req.nextUrl.searchParams;
  const format = (searchParams.get("format") || "csv").toLowerCase();
  const channelFilter = searchParams.get("channel");

  let query = supabase
    .from("leads")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  if (channelFilter && channelFilter !== "all") {
    query = query.ilike("channel", channelFilter);
  }

  const { data: leads, error: leadsError } = await query;
  if (leadsError) {
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }

  if (format === "json") {
    return NextResponse.json({
      project: project.name,
      tracking_id: project.tracking_id,
      exported_at: new Date().toISOString(),
      total_leads: leads?.length || 0,
      leads: leads || [],
    });
  }

  // Format as CSV
  const headers = [
    "ID",
    "Created At",
    "Name",
    "Email",
    "Channel",
    "Source",
    "Medium",
    "Campaign",
    "Content",
    "Term",
    "GCLID",
    "GBRAID",
    "Drilldown 1",
    "Drilldown 2",
    "Drilldown 3",
    "Landing Page",
    "Landing Page Group",
    "Submit Page",
    "Referrer",
  ];

  const rows = (leads || []).map((lead: any) => [
    escapeCsvField(lead.id),
    escapeCsvField(lead.created_at),
    escapeCsvField(lead.name),
    escapeCsvField(lead.email),
    escapeCsvField(lead.channel),
    escapeCsvField(lead.source),
    escapeCsvField(lead.medium),
    escapeCsvField(lead.campaign),
    escapeCsvField(lead.content),
    escapeCsvField(lead.term),
    escapeCsvField(lead.gclid),
    escapeCsvField(lead.gbraid),
    escapeCsvField(lead.drilldown1),
    escapeCsvField(lead.drilldown2),
    escapeCsvField(lead.drilldown3),
    escapeCsvField(lead.landing_page),
    escapeCsvField(lead.landing_page_group),
    escapeCsvField(lead.submit_page),
    escapeCsvField(lead.referrer),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\r\n");

  const safeFilename = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-attribution-leads.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeFilename}"`,
    },
  });
}