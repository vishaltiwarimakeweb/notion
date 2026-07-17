import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getAccessibleWorkspace } from "@/lib/workspaces";
import { Page } from "@/models/Page";

export async function GET(
  _request: Request,
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

  const pages = await Page.find({ workspaceId: workspace._id, isDeleted: true }).sort({
    deletedAt: -1,
  });

  return NextResponse.json({ pages });
}
