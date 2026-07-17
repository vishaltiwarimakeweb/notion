import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { getAccessibleWorkspace } from "@/lib/workspaces";
import { Page } from "@/models/Page";
import { Content } from "@/models/Content";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const workspace = await getAccessibleWorkspace(id, session);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const pages = await Page.find({ workspaceId: workspace._id, isDeleted: false }).sort({
    createdAt: 1,
  });

  return NextResponse.json({ pages });
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const workspace = await getAccessibleWorkspace(id, session);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const body = await request.json();
  const title = String(body.title ?? "").trim();
  if (title.length < 3) {
    return NextResponse.json(
      { error: "Page title must be at least 3 characters." },
      { status: 400 }
    );
  }

  let parentPageId: string | null = null;
  if (body.parentPageId) {
    if (!mongoose.isValidObjectId(body.parentPageId)) {
      return NextResponse.json({ error: "Invalid parent page." }, { status: 400 });
    }
    const parent = await Page.findOne({
      _id: body.parentPageId,
      workspaceId: workspace._id,
      isDeleted: false,
    });
    if (!parent) {
      return NextResponse.json({ error: "Parent page not found." }, { status: 400 });
    }
    parentPageId = body.parentPageId;
  }

  await connectToDatabase();
  const page = await Page.create({
    organizationId: workspace.organizationId,
    workspaceId: workspace._id,
    parentPageId,
    title,
    createdBy: session.userId,
    createdByType: session.userType,
  });
  await Content.create({ pageId: page._id, blocks: [] });

  return NextResponse.json({ page }, { status: 201 });
}
