import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Organization } from "@/models/Organization";
import { Manager, type IManager } from "@/models/Manager";
import { createSessionToken, setSessionCookie } from "@/lib/session";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json();
  const organizationName = String(body.organizationName ?? "").trim();
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (organizationName.length < 5) {
    return NextResponse.json(
      { error: "Organization name must be at least 5 characters." },
      { status: 400 }
    );
  }
  if (name.length < 2) {
    return NextResponse.json(
      { error: "Name must be at least 2 characters." },
      { status: 400 }
    );
  }
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const existing = await Manager.findOne({ email });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const session = await mongoose.startSession();
  let manager: IManager | undefined;
  try {
    await session.withTransaction(async () => {
      const [organization] = await Organization.create(
        [{ name: organizationName }],
        { session }
      );
      [manager] = await Manager.create(
        [
          {
            organizationId: organization._id,
            name,
            email,
            password: hashedPassword,
          },
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  if (!manager) {
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }

  const token = await createSessionToken({
    managerId: manager._id.toString(),
    organizationId: manager.organizationId.toString(),
    email: manager.email,
  });
  await setSessionCookie(token);

  return NextResponse.json(
    { manager: { id: manager._id, name: manager.name, email: manager.email } },
    { status: 201 }
  );
}
