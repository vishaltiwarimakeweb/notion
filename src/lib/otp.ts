import bcrypt from "bcrypt";
import { redis } from "@/lib/redis";

const OTP_TTL_SECONDS = 90; // doubles as the resend cooldown and the OTP's validity window
const LOCKOUT_SECONDS = 60 * 3;
const MAX_ATTEMPTS = 5;

const otpKey = (email: string) => `otp:${email}`;
const attemptsKey = (email: string) => `otp:attempts:${email}`;
const lockKey = (email: string) => `otp:lock:${email}`;

export class OtpError extends Error {
  code: "RESEND_COOLDOWN" | "LOCKED" | "INVALID_OR_EXPIRED";
  retryAfterSeconds?: number;

  constructor(
    code: OtpError["code"],
    message: string,
    retryAfterSeconds?: number
  ) {
    super(message);
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function generateOtp() {
  return String(Math.floor(10000 + Math.random() * 90000)); // 5 digits
}

export async function requestOtp(email: string): Promise<string> {
  const locked = await redis.ttl(lockKey(email));
  if (locked > 0) {
    throw new OtpError(
      "LOCKED",
      "Too many incorrect attempts. Try again later.",
      locked
    );
  }

  const remainingTtl = await redis.ttl(otpKey(email));
  if (remainingTtl > 0) {
    throw new OtpError(
      "RESEND_COOLDOWN",
      "Please wait before requesting a new OTP.",
      remainingTtl
    );
  }

  const otp = generateOtp();
  const hashed = await bcrypt.hash(otp, 10);

  await redis.set(otpKey(email), hashed, "EX", OTP_TTL_SECONDS);
  await redis.del(attemptsKey(email));

  return otp;
}

export async function verifyOtp(email: string, otp: string): Promise<void> {
  const locked = await redis.ttl(lockKey(email));
  if (locked > 0) {
    throw new OtpError(
      "LOCKED",
      "Too many incorrect attempts. Try again later.",
      locked
    );
  }

  const hashed = await redis.get(otpKey(email));
  if (!hashed) {
    throw new OtpError("INVALID_OR_EXPIRED", "OTP is invalid or has expired.");
  }

  const isMatch = await bcrypt.compare(otp, hashed);
  if (isMatch) {
    await redis.del(otpKey(email), attemptsKey(email), lockKey(email));
    return;
  }

  const attempts = await redis.incr(attemptsKey(email));
  if (attempts === 1) {
    await redis.expire(attemptsKey(email), OTP_TTL_SECONDS);
  }

  if (attempts > MAX_ATTEMPTS) {
    await redis.set(lockKey(email), "1", "EX", LOCKOUT_SECONDS);
    await redis.del(otpKey(email), attemptsKey(email));
    throw new OtpError(
      "LOCKED",
      "Too many incorrect attempts. Try again later.",
      LOCKOUT_SECONDS
    );
  }

  throw new OtpError("INVALID_OR_EXPIRED", "OTP is invalid or has expired.");
}
