import { connectToDatabase } from "@/lib/db";
import { Invitation } from "@/models/Invitation";
import { Organization } from "@/models/Organization";
import { Workspace } from "@/models/Workspace";
import { Button } from "@/components/ui/Button";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "This invitation link is invalid or has expired.",
  email_mismatch:
    "The account you signed in with doesn't match the email this invitation was sent to.",
  oauth_failed: "Something went wrong signing you in. Please try again.",
  limit_reached: "This workspace has reached its member limit for the organization's plan.",
};

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  await connectToDatabase();
  const invitation = await Invitation.findOne({ token });

  const isValid =
    invitation && invitation.status === "pending" && invitation.expiresAt > new Date();

  const organization = isValid
    ? await Organization.findById(invitation.organizationId)
    : null;
  const workspace = isValid ? await Workspace.findById(invitation.workspaceId) : null;

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-20 text-center">
      {isValid && organization && workspace ? (
        <>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
            Join {organization.name}
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            You&apos;ve been invited to the <strong>{workspace.title}</strong> workspace.
          </p>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {ERROR_MESSAGES[error] ?? "Something went wrong. Please try again."}
            </p>
          )}

          <div className="mt-8 flex flex-col gap-3">
            <a href={`/api/oauth/google/start?token=${token}`}>
              <Button className="w-full">Continue with Google</Button>
            </a>
            <a href={`/api/oauth/github/start?token=${token}`}>
              <Button variant="secondary" className="w-full">
                Continue with GitHub
              </Button>
            </a>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
            Invitation not found
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            {ERROR_MESSAGES[error ?? "invalid"] ?? ERROR_MESSAGES.invalid}
          </p>
        </>
      )}
    </div>
  );
}
