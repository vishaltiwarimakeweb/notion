import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Workspace } from "@/models/Workspace";
import { WorkspaceMember } from "@/models/WorkspaceMember";
import type { SessionPayload } from "@/lib/session";

export async function getOwnedWorkspace(id: string, organizationId: mongoose.Types.ObjectId) {
  if (!mongoose.isValidObjectId(id)) return null;

  await connectToDatabase();
  const workspace = await Workspace.findById(id);
  if (!workspace || !workspace.organizationId.equals(organizationId)) return null;

  return workspace;
}

// Manager: any workspace in their org. Employee: only workspaces they're a WorkspaceMember of.
export async function getAccessibleWorkspace(id: string, session: SessionPayload) {
  if (!mongoose.isValidObjectId(id)) return null;

  await connectToDatabase();
  const workspace = await Workspace.findOne({ _id: id, isDeleted: false });
  if (!workspace || !workspace.organizationId.equals(session.organizationId)) return null;

  if (session.userType === "manager") return workspace;

  const membership = await WorkspaceMember.findOne({
    workspaceId: workspace._id,
    employeeId: session.userId,
  });
  return membership ? workspace : null;
}

// Returns the workspace IDs a session may act on, or null to mean "unrestricted within
// the org" (a Manager). Callers combine this with an organizationId filter for Managers
// and an _id/workspaceId $in filter for Employees. Shared by /api/search and the
// assistant tools so the manager-vs-employee branching lives in exactly one place.
export async function getAccessibleWorkspaceIds(
  session: SessionPayload
): Promise<mongoose.Types.ObjectId[] | null> {
  if (session.userType === "manager") return null;

  await connectToDatabase();
  const memberships = await WorkspaceMember.find({ employeeId: session.userId });
  return memberships.map((m) => m.workspaceId);
}
