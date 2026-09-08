import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id") || searchParams.get("projectId");
  const format = searchParams.get("format") || "csv";

  if (!projectId) {
    return NextResponse.json({ error: "Missing project_id parameter" }, { status: 400 });
  }

  const redirectUrl = new URL(`/api/projects/${projectId}/export?format=${format}`, req.url);
  return NextResponse.redirect(redirectUrl);
}
