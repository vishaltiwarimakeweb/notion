import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { getAccessibleWorkspaceIds } from "@/lib/workspaces";
import { escapeRegExp } from "@/lib/search";
import { Workspace } from "@/models/Workspace";
import { Page } from "@/models/Page";

const RESULT_LIMIT = 20;

export async function GET(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ workspaces: [], pages: [] });
  }
  const titleMatch = new RegExp(escapeRegExp(q), "i");

  await connectToDatabase();
  const workspaceIds = await getAccessibleWorkspaceIds(session);

  const workspaceFilter =
    workspaceIds === null
      ? { organizationId: session.organizationId, isDeleted: false, title: titleMatch }
      : { _id: { $in: workspaceIds }, isDeleted: false, title: titleMatch };
  const pageFilter =
    workspaceIds === null
      ? { organizationId: session.organizationId, isDeleted: false, title: titleMatch }
      : { workspaceId: { $in: workspaceIds }, isDeleted: false, title: titleMatch };

  const [workspaces, pages] = await Promise.all([
    Workspace.find(workspaceFilter).limit(RESULT_LIMIT),
    Page.find(pageFilter).limit(RESULT_LIMIT),
  ]);

  return NextResponse.json({ workspaces, pages });
}
