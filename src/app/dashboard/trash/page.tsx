import { redirect } from "next/navigation";
import { getCurrentManager } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Workspace } from "@/models/Workspace";
import { RestoreWorkspaceButton } from "@/components/RestoreWorkspaceButton";

export default async function TrashPage() {
  const manager = await getCurrentManager();
  if (!manager) redirect("/login");

  await connectToDatabase();
  const workspaces = await Workspace.find({
    organizationId: manager.organizationId,
    isDeleted: true,
  }).sort({ deletedAt: -1 });

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Trash</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Deleted workspaces are kept here until restored.
      </p>

      {workspaces.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-600 dark:text-neutral-400">
          Trash is empty.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {workspaces.map((workspace) => (
            <li
              key={workspace._id.toString()}
              className="flex items-center justify-between rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">
                  {workspace.title}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Deleted{" "}
                  {workspace.deletedAt
                    ? new Date(workspace.deletedAt).toLocaleDateString()
                    : ""}
                </p>
              </div>
              <RestoreWorkspaceButton id={workspace._id.toString()} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
