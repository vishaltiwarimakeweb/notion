import { connectToDatabase } from "@/lib/db";
import { RecentlyVisited } from "@/models/RecentlyVisited";
import { Page } from "@/models/Page";
import type { SessionPayload } from "@/lib/session";
import type mongoose from "mongoose";

const RESULT_LIMIT = 10;
// Fetch a few extra visits since some may point at pages that were later trashed.
const FETCH_BUFFER = 20;

export async function recordVisit(session: SessionPayload, pageId: mongoose.Types.ObjectId) {
  await connectToDatabase();
  await RecentlyVisited.findOneAndUpdate(
    { userId: session.userId, pageId },
    { userId: session.userId, userType: session.userType, pageId, visitedAt: new Date() },
    { upsert: true }
  );
}

export async function getRecentlyVisitedPages(session: SessionPayload) {
  await connectToDatabase();
  const visits = await RecentlyVisited.find({ userId: session.userId })
    .sort({ visitedAt: -1 })
    .limit(FETCH_BUFFER);

  const pages = await Page.find({
    _id: { $in: visits.map((v) => v.pageId) },
    isDeleted: false,
  });
  const pageById = new Map(pages.map((p) => [p._id.toString(), p]));

  return visits
    .map((visit) => {
      const page = pageById.get(visit.pageId.toString());
      return page ? { page, visitedAt: visit.visitedAt } : undefined;
    })
    .filter((entry) => entry !== undefined)
    .slice(0, RESULT_LIMIT);
}
