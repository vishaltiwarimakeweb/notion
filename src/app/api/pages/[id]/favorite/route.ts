import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getAccessiblePage } from "@/lib/pages";
import { Favorite } from "@/models/Favorite";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const page = await getAccessiblePage(id, session);
  if (!page) {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }

  await Favorite.findOneAndUpdate(
    { userId: session.userId, pageId: page._id },
    { userId: session.userId, userType: session.userType, pageId: page._id },
    { upsert: true }
  );

  return NextResponse.json({ favorited: true });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const page = await getAccessiblePage(id, session);
  if (!page) {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }

  await Favorite.deleteOne({ userId: session.userId, pageId: page._id });

  return NextResponse.json({ favorited: false });
}
