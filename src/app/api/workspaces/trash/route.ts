import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentManager } from "@/lib/auth";
import { Workspace } from "@/models/Workspace";

export async function GET() {
  const manager = await getCurrentManager();
  if (!manager) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  await connectToDatabase();
  const workspaces = await Workspace.find({
    organizationId: manager.organizationId,
    isDeleted: true,
  }).sort({ deletedAt: -1 });

  return NextResponse.json({ workspaces });
}
