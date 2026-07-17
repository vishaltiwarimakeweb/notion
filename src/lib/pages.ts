import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Page } from "@/models/Page";
import { getAccessibleWorkspace } from "@/lib/workspaces";
import type { SessionPayload } from "@/lib/session";

export async function getAccessiblePage(id: string, session: SessionPayload) {
  if (!mongoose.isValidObjectId(id)) return null;

  await connectToDatabase();
  const page = await Page.findOne({ _id: id, isDeleted: false });
  if (!page) return null;

  const workspace = await getAccessibleWorkspace(page.workspaceId.toString(), session);
  if (!workspace) return null;

  return page;
}

// Same access check as getAccessiblePage, but doesn't require the page itself to be
// non-deleted — needed so PATCH/DELETE can also handle restoring a trashed page.
export async function getPageForMutation(id: string, session: SessionPayload) {
  if (!mongoose.isValidObjectId(id)) return null;

  await connectToDatabase();
  const page = await Page.findById(id);
  if (!page) return null;

  const workspace = await getAccessibleWorkspace(page.workspaceId.toString(), session);
  if (!workspace) return null;

  return page;
}

// Soft-deletes a page and every descendant beneath it, so trashing a parent
// never leaves orphaned-but-accessible children behind.
export async function cascadeSoftDelete(rootPageId: mongoose.Types.ObjectId) {
  const idsToDelete = [rootPageId];
  let frontier = [rootPageId];

  while (frontier.length > 0) {
    const children = await Page.find(
      { parentPageId: { $in: frontier }, isDeleted: false },
      "_id"
    );
    const childIds = children.map((c) => c._id);
    idsToDelete.push(...childIds);
    frontier = childIds;
  }

  const now = new Date();
  await Page.updateMany({ _id: { $in: idsToDelete } }, { isDeleted: true, deletedAt: now });
  return idsToDelete;
}
