import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Manager } from "@/models/Manager";
import { requestOtp, OtpError } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  await connectToDatabase();
  const manager = await Manager.findOne({ email });

  // Don't reveal whether the email is registered; only actually send when it is.
  if (!manager) {
    return NextResponse.json({
      message: "If that email is registered, an OTP has been sent.",
    });
  }

  try {
    const otp = await requestOtp(email);
    await sendOtpEmail(email, otp);
  } catch (error) {
    if (error instanceof OtpError) {
      return NextResponse.json(
        { error: error.message, retryAfterSeconds: error.retryAfterSeconds },
        { status: 429 }
      );
    }
    throw error;
  }

  return NextResponse.json({
    message: "If that email is registered, an OTP has been sent.",
  });
}
