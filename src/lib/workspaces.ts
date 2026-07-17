import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Workspace } from "@/models/Workspace";

export async function getOwnedWorkspace(id: string, organizationId: mongoose.Types.ObjectId) {
  if (!mongoose.isValidObjectId(id)) return null;

  await connectToDatabase();
  const workspace = await Workspace.findById(id);
  if (!workspace || !workspace.organizationId.equals(organizationId)) return null;

  return workspace;
}
