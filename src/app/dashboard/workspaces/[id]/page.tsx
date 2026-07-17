import { notFound, redirect } from "next/navigation";
import mongoose from "mongoose";
import { getCurrentManager } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Workspace } from "@/models/Workspace";
import { WorkspaceSettings } from "@/components/WorkspaceSettings";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const manager = await getCurrentManager();
  if (!manager) redirect("/login");

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();

  await connectToDatabase();
  const workspace = await Workspace.findOne({ _id: id, isDeleted: false });
  if (!workspace || !workspace.organizationId.equals(manager.organizationId)) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
        {workspace.title}
      </h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Pages are coming in a future update.
      </p>

      <WorkspaceSettings id={workspace._id.toString()} title={workspace.title} />
    </div>
  );
}
