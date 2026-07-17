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
    isDeleted: false,
  }).sort({ createdAt: -1 });

  return NextResponse.json({ workspaces });
}

export async function POST(request: Request) {
  const manager = await getCurrentManager();
  if (!manager) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json();
  const title = String(body.title ?? "").trim();

  if (title.length < 6) {
    return NextResponse.json(
      { error: "Workspace name must be at least 6 characters." },
      { status: 400 }
    );
  }

  await connectToDatabase();
  const workspace = await Workspace.create({
    organizationId: manager.organizationId,
    title,
  });

  return NextResponse.json({ workspace }, { status: 201 });
}
