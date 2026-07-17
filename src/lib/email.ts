import { BrevoClient } from "@getbrevo/brevo";

function getClient() {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY is not set");
  return new BrevoClient({ apiKey });
}

function getSender() {
  const email = process.env.BREVO_SENDER_EMAIL;
  if (!email) throw new Error("BREVO_SENDER_EMAIL is not set");
  const name = process.env.BREVO_SENDER_NAME ?? "Notion Clone";
  return { email, name };
}

export async function sendOtpEmail(email: string, otp: string) {
  const client = getClient();
  await client.transactionalEmails.sendTransacEmail({
    sender: getSender(),
    to: [{ email }],
    subject: "Your password reset OTP",
    htmlContent: `<p>Your OTP is <strong>${otp}</strong>. It expires in 90 seconds.</p>`,
  });
}

export async function sendInvitationEmail(
  email: string,
  organizationName: string,
  workspaceName: string,
  inviteUrl: string
) {
  const client = getClient();
  await client.transactionalEmails.sendTransacEmail({
    sender: getSender(),
    to: [{ email }],
    subject: `You've been invited to join ${organizationName}`,
    htmlContent: `<p>You've been invited to join <strong>${organizationName}</strong>'s <strong>${workspaceName}</strong> workspace.</p><p><a href="${inviteUrl}">Accept invitation</a></p>`,
  });
}
