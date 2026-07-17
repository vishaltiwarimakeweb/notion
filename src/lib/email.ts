import { BrevoClient } from "@getbrevo/brevo";

function getClient() {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY is not set");
  return new BrevoClient({ apiKey });
}

export async function sendOtpEmail(email: string, otp: string) {
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!senderEmail) throw new Error("BREVO_SENDER_EMAIL is not set");

  const client = getClient();
  await client.transactionalEmails.sendTransacEmail({
    sender: { email: senderEmail, name: "Notion Clone" },
    to: [{ email }],
    subject: "Your password reset OTP",
    htmlContent: `<p>Your OTP is <strong>${otp}</strong>. It expires in 90 seconds.</p>`,
  });
}
