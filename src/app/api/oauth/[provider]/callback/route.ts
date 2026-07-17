import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import { getMemberLimit } from "@/lib/billing";
import { exchangeCodeForProfile, verifyOAuthState, type OAuthProvider } from "@/lib/oauth";
import { Organization } from "@/models/Organization";
import { Employee } from "@/models/Employee";
import { WorkspaceMember } from "@/models/WorkspaceMember";
import { Invitation } from "@/models/Invitation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const url = new URL(request.url);

  if (provider !== "google" && provider !== "github") {
    return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", url.origin));
  }

  const statePayload = await verifyOAuthState(state);
  if (!statePayload || statePayload.provider !== provider) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", url.origin));
  }

  const { inviteToken } = statePayload;
  const invitePath = `/invite/${inviteToken}`;

  await connectToDatabase();
  const invitation = await Invitation.findOne({ token: inviteToken });
  if (!invitation || invitation.status !== "pending" || invitation.expiresAt < new Date()) {
    return NextResponse.redirect(new URL(`${invitePath}?error=invalid`, url.origin));
  }

  let profile;
  try {
    const redirectUri = `${url.origin}/api/oauth/${provider}/callback`;
    profile = await exchangeCodeForProfile(provider as OAuthProvider, code, redirectUri);
  } catch {
    return NextResponse.redirect(new URL(`${invitePath}?error=oauth_failed`, url.origin));
  }

  if (profile.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return NextResponse.redirect(new URL(`${invitePath}?error=email_mismatch`, url.origin));
  }

  const organization = await Organization.findById(invitation.organizationId);
  if (!organization) {
    return NextResponse.redirect(new URL(`${invitePath}?error=invalid`, url.origin));
  }
  const limit = getMemberLimit(organization.billingPlan);
  const currentCount = await WorkspaceMember.countDocuments({
    workspaceId: invitation.workspaceId,
  });
  if (currentCount >= limit) {
    return NextResponse.redirect(new URL(`${invitePath}?error=limit_reached`, url.origin));
  }

  let employee = await Employee.findOne({
    organizationId: invitation.organizationId,
    email: invitation.email,
  });
  if (!employee) {
    employee = await Employee.create({
      organizationId: invitation.organizationId,
      name: profile.name,
      avatar: profile.avatar,
      email: invitation.email,
      oAuth: provider === "google" ? "Google" : "Github",
    });
  }

  try {
    await WorkspaceMember.create({
      organizationId: invitation.organizationId,
      workspaceId: invitation.workspaceId,
      employeeId: employee._id,
    });
  } catch {
    // Already a member (unique index) — fine, continue.
  }

  invitation.status = "accepted";
  await invitation.save();

  const token = await createSessionToken({
    userId: employee._id.toString(),
    userType: "employee",
    organizationId: employee.organizationId.toString(),
    email: employee.email,
  });
  await setSessionCookie(token);

  return NextResponse.redirect(new URL("/dashboard", url.origin));
}
