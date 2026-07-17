import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentManager } from "@/lib/auth";
import { getOwnedWorkspace } from "@/lib/workspaces";
import { getMemberLimit } from "@/lib/billing";
import { sendInvitationEmail } from "@/lib/email";
import { Organization } from "@/models/Organization";
import { Employee } from "@/models/Employee";
import { WorkspaceMember } from "@/models/WorkspaceMember";
import { Invitation } from "@/models/Invitation";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITATION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days — not specified upstream, a reasonable default

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const manager = await getCurrentManager();
  if (!manager) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const workspace = await getOwnedWorkspace(id, manager.organizationId);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  await connectToDatabase();

  const organization = await Organization.findById(manager.organizationId);
  if (!organization) {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }
  const limit = getMemberLimit(organization.billingPlan);
  const currentCount = await WorkspaceMember.countDocuments({ workspaceId: workspace._id });

  // Existing employees in the org don't need a fresh email invitation.
  const existingEmployee = await Employee.findOne({
    organizationId: manager.organizationId,
    email,
  });

  if (existingEmployee) {
    const alreadyMember = await WorkspaceMember.findOne({
      workspaceId: workspace._id,
      employeeId: existingEmployee._id,
    });
    if (alreadyMember) {
      return NextResponse.json(
        { error: "This employee is already a member of the workspace." },
        { status: 400 }
      );
    }
    if (currentCount >= limit) {
      return NextResponse.json(
        { error: `Member limit reached for the ${organization.billingPlan} plan.` },
        { status: 400 }
      );
    }

    await WorkspaceMember.create({
      organizationId: manager.organizationId,
      workspaceId: workspace._id,
      employeeId: existingEmployee._id,
    });
    return NextResponse.json({ message: "Employee added to workspace." }, { status: 201 });
  }

  if (currentCount >= limit) {
    return NextResponse.json(
      { error: `Member limit reached for the ${organization.billingPlan} plan.` },
      { status: 400 }
    );
  }

  // Replace any existing pending invite for this email+workspace rather than stacking tokens.
  await Invitation.deleteMany({ workspaceId: workspace._id, email, status: "pending" });

  const token = randomBytes(32).toString("hex");
  await Invitation.create({
    organizationId: manager.organizationId,
    workspaceId: workspace._id,
    invitedBy: manager._id,
    email,
    token,
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
  });

  const origin = new URL(request.url).origin;
  const inviteUrl = `${origin}/invite/${token}`;
  await sendInvitationEmail(email, organization.name, workspace.title, inviteUrl);

  return NextResponse.json({ message: "Invitation sent." }, { status: 201 });
}
