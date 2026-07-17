import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { getCurrentManager } from "@/lib/auth";
import { Workspace } from "@/models/Workspace";

type RouteContext = { params: Promise<{ id: string }> };

async function getOwnedWorkspace(id: string, organizationId: mongoose.Types.ObjectId) {
  if (!mongoose.isValidObjectId(id)) return null;

  await connectToDatabase();
  const workspace = await Workspace.findById(id);
  if (!workspace || !workspace.organizationId.equals(organizationId)) return null;

  return workspace;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const manager = await getCurrentManager();
  if (!manager) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const workspace = await getOwnedWorkspace(id, manager.organizationId);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  return NextResponse.json({ workspace });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const manager = await getCurrentManager();
  if (!manager) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const workspace = await getOwnedWorkspace(id, manager.organizationId);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const body = await request.json();

  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (title.length < 6) {
      return NextResponse.json(
        { error: "Workspace name must be at least 6 characters." },
        { status: 400 }
      );
    }
    workspace.title = title;
  }

  if (body.isDeleted !== undefined) {
    workspace.isDeleted = Boolean(body.isDeleted);
    workspace.deletedAt = workspace.isDeleted ? new Date() : null;
  }

  await workspace.save();

  return NextResponse.json({ workspace });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const manager = await getCurrentManager();
  if (!manager) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const workspace = await getOwnedWorkspace(id, manager.organizationId);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  workspace.isDeleted = true;
  workspace.deletedAt = new Date();
  await workspace.save();

  return NextResponse.json({ workspace });
}
