import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getAccessiblePage } from "@/lib/pages";
import { Content } from "@/models/Content";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const page = await getAccessiblePage(id, session);
  if (!page) {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }

  const body = await request.json();
  if (!Array.isArray(body.blocks)) {
    return NextResponse.json({ error: "blocks must be an array." }, { status: 400 });
  }

  const content = await Content.findOneAndUpdate(
    { pageId: page._id },
    { blocks: body.blocks },
    { upsert: true, new: true }
  );

  return NextResponse.json({ blocks: content.blocks });
}
