import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { getAccessibleWorkspace } from "@/lib/workspaces";
import { escapeRegExp } from "@/lib/search";
import { Page } from "@/models/Page";

const RESULT_LIMIT = 20;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const workspace = await getAccessibleWorkspace(id, session);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ pages: [] });
  }

  await connectToDatabase();
  const pages = await Page.find({
    workspaceId: workspace._id,
    isDeleted: false,
    title: new RegExp(escapeRegExp(q), "i"),
  }).limit(RESULT_LIMIT);

  return NextResponse.json({ pages });
}
