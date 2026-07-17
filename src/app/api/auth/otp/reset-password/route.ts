import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { connectToDatabase } from "@/lib/db";
import { Manager } from "@/models/Manager";
import { verifyOtp, OtpError } from "@/lib/otp";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const otp = String(body.otp ?? "").trim();
  const newPassword = String(body.newPassword ?? "");

  if (!email || !otp) {
    return NextResponse.json(
      { error: "Email and OTP are required." },
      { status: 400 }
    );
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  try {
    await verifyOtp(email, otp);
  } catch (error) {
    if (error instanceof OtpError) {
      const status = error.code === "LOCKED" ? 429 : 400;
      return NextResponse.json(
        { error: error.message, retryAfterSeconds: error.retryAfterSeconds },
        { status }
      );
    }
    throw error;
  }

  await connectToDatabase();
  const manager = await Manager.findOne({ email });
  if (!manager) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  manager.password = await bcrypt.hash(newPassword, 10);
  await manager.save();

  return NextResponse.json({ message: "Password has been reset." });
}
