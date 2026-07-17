import { connectToDatabase } from "@/lib/db";
import { Manager, type IManager } from "@/models/Manager";
import { getSessionFromCookies } from "@/lib/session";

export async function getCurrentManager(): Promise<IManager | null> {
  const session = await getSessionFromCookies();
  if (!session) return null;

  await connectToDatabase();
  return Manager.findById(session.managerId).select("-password");
}

export {
  COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
  setSessionCookie,
  clearSessionCookie,
  getSessionFromCookies,
  type SessionPayload,
} from "@/lib/session";
