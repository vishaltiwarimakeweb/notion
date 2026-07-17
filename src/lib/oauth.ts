import { SignJWT, jwtVerify } from "jose";

export type OAuthProvider = "google" | "github";

export type OAuthProfile = {
  email: string;
  name: string;
  avatar: string | null;
};

const OAUTH_STATE_TTL_SECONDS = 60 * 5;

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signOAuthState(payload: {
  provider: OAuthProvider;
  inviteToken: string;
}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${OAUTH_STATE_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyOAuthState(
  state: string
): Promise<{ provider: OAuthProvider; inviteToken: string } | null> {
  try {
    const { payload } = await jwtVerify(state, getSecret());
    return payload as unknown as { provider: OAuthProvider; inviteToken: string };
  } catch {
    return null;
  }
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function getAuthorizeUrl(
  provider: OAuthProvider,
  redirectUri: string,
  state: string
) {
  if (provider === "google") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", requireEnv("GOOGLE_CLIENT_ID"));
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    return url.toString();
  }

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", requireEnv("GITHUB_CLIENT_ID"));
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "read:user user:email");
  url.searchParams.set("state", state);
  return url.toString();
}

async function exchangeGoogleCode(code: string, redirectUri: string): Promise<OAuthProfile> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) throw new Error("Google token exchange failed.");
  const { access_token } = await tokenRes.json();

  const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!profileRes.ok) throw new Error("Failed to fetch Google profile.");
  const profile = await profileRes.json();

  return {
    email: String(profile.email ?? "").toLowerCase(),
    name: profile.name ?? profile.email,
    avatar: profile.picture ?? null,
  };
}

async function exchangeGithubCode(code: string, redirectUri: string): Promise<OAuthProfile> {
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: requireEnv("GITHUB_CLIENT_ID"),
      client_secret: requireEnv("GITHUB_CLIENT_SECRET"),
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!tokenRes.ok) throw new Error("GitHub token exchange failed.");
  const { access_token } = await tokenRes.json();
  if (!access_token) throw new Error("GitHub token exchange failed.");

  const headers = {
    Authorization: `Bearer ${access_token}`,
    Accept: "application/vnd.github+json",
  };

  const userRes = await fetch("https://api.github.com/user", { headers });
  if (!userRes.ok) throw new Error("Failed to fetch GitHub profile.");
  const user = await userRes.json();

  // GitHub omits email from /user when it's private; user:email scope + /user/emails covers that.
  let email: string | null = user.email ?? null;
  if (!email) {
    const emailsRes = await fetch("https://api.github.com/user/emails", { headers });
    if (emailsRes.ok) {
      const emails: { email: string; primary: boolean; verified: boolean }[] =
        await emailsRes.json();
      email = emails.find((e) => e.primary && e.verified)?.email ?? null;
    }
  }
  if (!email) throw new Error("GitHub account has no verified email.");

  return {
    email: email.toLowerCase(),
    name: user.name ?? user.login,
    avatar: user.avatar_url ?? null,
  };
}

export async function exchangeCodeForProfile(
  provider: OAuthProvider,
  code: string,
  redirectUri: string
): Promise<OAuthProfile> {
  return provider === "google"
    ? exchangeGoogleCode(code, redirectUri)
    : exchangeGithubCode(code, redirectUri);
}
