import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getAccessiblePage } from "@/lib/pages";
import { signCollabToken } from "@/lib/collabToken";

export async function GET(
  _request: Request,
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

  const token = await signCollabToken({
    userId: session.userId,
    userType: session.userType,
    pageId: page._id.toString(),
  });

  return NextResponse.json({ token });
}
