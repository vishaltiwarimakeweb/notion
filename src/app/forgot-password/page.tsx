"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function sendOtp() {
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to send OTP.");
        if (data.retryAfterSeconds) setCooldown(data.retryAfterSeconds);
        return;
      }

      toast.success(data.message);
      setStep("reset");
      setCooldown(90);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleRequestSubmit(event: FormEvent) {
    event.preventDefault();
    sendOtp();
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/otp/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to reset password.");
        return;
      }

      toast.success("Password reset. Please log in.");
      router.push("/login");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-20">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
        Reset your password
      </h1>

      {step === "request" ? (
        <form onSubmit={handleRequestSubmit} className="mt-8 flex flex-col gap-4">
          <Input
            label="Email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" isLoading={isLoading} className="mt-2">
            Send OTP
          </Button>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="mt-8 flex flex-col gap-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Enter the 5-digit OTP sent to {email}.
          </p>
          <Input
            label="OTP"
            name="otp"
            inputMode="numeric"
            maxLength={5}
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <Input
            label="New password"
            name="newPassword"
            type="password"
            minLength={8}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Button type="submit" isLoading={isLoading} className="mt-2">
            Reset password
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={cooldown > 0 || isLoading}
            onClick={sendOtp}
          >
            {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
          </Button>
        </form>
      )}
    </div>
  );
}
