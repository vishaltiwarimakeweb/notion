import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Invitation } from "@/models/Invitation";
import { getAuthorizeUrl, signOAuthState, type OAuthProvider } from "@/lib/oauth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  if (provider !== "google" && provider !== "github") {
    return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
  }

  const url = new URL(request.url);
  const inviteToken = url.searchParams.get("token");
  if (!inviteToken) {
    return NextResponse.json({ error: "Missing invitation token." }, { status: 400 });
  }

  await connectToDatabase();
  const invitation = await Invitation.findOne({ token: inviteToken });
  if (!invitation || invitation.status !== "pending" || invitation.expiresAt < new Date()) {
    return NextResponse.redirect(new URL(`/invite/${inviteToken}?error=invalid`, url.origin));
  }

  const state = await signOAuthState({
    provider: provider as OAuthProvider,
    inviteToken,
  });
  const redirectUri = `${url.origin}/api/oauth/${provider}/callback`;

  return NextResponse.redirect(getAuthorizeUrl(provider as OAuthProvider, redirectUri, state));
}
