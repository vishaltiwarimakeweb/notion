import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getRecentlyVisitedPages } from "@/lib/recentlyVisited";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const results = await getRecentlyVisitedPages(session);
  return NextResponse.json({ results });
}
