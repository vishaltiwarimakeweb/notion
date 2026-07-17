import { SignJWT, jwtVerify } from "jose";

const COLLAB_TOKEN_TTL_SECONDS = 60 * 5;

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export type CollabTokenPayload = {
  userId: string;
  userType: "manager" | "employee";
  pageId: string;
};

export async function signCollabToken(payload: CollabTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${COLLAB_TOKEN_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyCollabToken(token: string): Promise<CollabTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as CollabTokenPayload;
  } catch {
    return null;
  }
}
