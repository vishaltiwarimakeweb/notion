import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { escapeRegExp } from "@/lib/search";
import { Workspace } from "@/models/Workspace";
import { Page } from "@/models/Page";
import { WorkspaceMember } from "@/models/WorkspaceMember";

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

  let workspaceFilter: Record<string, unknown>;
  let pageFilter: Record<string, unknown>;

  if (session.userType === "manager") {
    workspaceFilter = { organizationId: session.organizationId, isDeleted: false, title: titleMatch };
    pageFilter = { organizationId: session.organizationId, isDeleted: false, title: titleMatch };
  } else {
    const memberships = await WorkspaceMember.find({ employeeId: session.userId });
    const workspaceIds = memberships.map((m) => m.workspaceId);
    workspaceFilter = { _id: { $in: workspaceIds }, isDeleted: false, title: titleMatch };
    pageFilter = { workspaceId: { $in: workspaceIds }, isDeleted: false, title: titleMatch };
  }

  const [workspaces, pages] = await Promise.all([
    Workspace.find(workspaceFilter).limit(RESULT_LIMIT),
    Page.find(pageFilter).limit(RESULT_LIMIT),
  ]);

  return NextResponse.json({ workspaces, pages });
}
