import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { connectToDatabase } from "@/lib/db";
import { Manager } from "@/models/Manager";
import { createSessionToken, setSessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const manager = await Manager.findOne({ email });
  const isMatch = manager ? await bcrypt.compare(password, manager.password) : false;

  if (!manager || !isMatch) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  const token = await createSessionToken({
    managerId: manager._id.toString(),
    organizationId: manager.organizationId.toString(),
    email: manager.email,
  });
  await setSessionCookie(token);

  return NextResponse.json({
    manager: { id: manager._id, name: manager.name, email: manager.email },
  });
}
