import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getAccessiblePage, getPageForMutation, cascadeSoftDelete } from "@/lib/pages";
import { Content } from "@/models/Content";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const page = await getAccessiblePage(id, session);
  if (!page) {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }

  const content = await Content.findOne({ pageId: page._id });

  return NextResponse.json({ page, blocks: content?.blocks ?? [] });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const page = await getPageForMutation(id, session);
  if (!page) {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }

  const body = await request.json();

  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (title.length < 3) {
      return NextResponse.json(
        { error: "Page title must be at least 3 characters." },
        { status: 400 }
      );
    }
    page.title = title;
  }

  if (body.isDeleted !== undefined) {
    const isDeleted = Boolean(body.isDeleted);
    if (isDeleted) {
      await page.save(); // persist any title change first
      await cascadeSoftDelete(page._id);
      return NextResponse.json({ page: { ...page.toObject(), isDeleted: true } });
    }
    page.isDeleted = false;
    page.deletedAt = null;
  }

  await page.save();

  return NextResponse.json({ page });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const page = await getPageForMutation(id, session);
  if (!page) {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }

  await cascadeSoftDelete(page._id);

  return NextResponse.json({ message: "Page moved to trash." });
}
