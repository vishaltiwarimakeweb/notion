import { connectToDatabase } from "@/lib/db";
import { Manager, type IManager } from "@/models/Manager";
import { Employee, type IEmployee } from "@/models/Employee";
import { getSessionFromCookies } from "@/lib/session";

export async function getCurrentManager(): Promise<IManager | null> {
  const session = await getSessionFromCookies();
  if (!session || session.userType !== "manager") return null;

  await connectToDatabase();
  return Manager.findById(session.userId).select("-password");
}

export async function getCurrentEmployee(): Promise<IEmployee | null> {
  const session = await getSessionFromCookies();
  if (!session || session.userType !== "employee") return null;

  await connectToDatabase();
  return Employee.findById(session.userId);
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
