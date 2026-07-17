import Link from "next/link";
import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { getCurrentManager, getCurrentEmployee } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Workspace } from "@/models/Workspace";
import { WorkspaceMember } from "@/models/WorkspaceMember";
import { CreateWorkspaceForm } from "@/components/CreateWorkspaceForm";

export default async function DashboardPage() {
  const manager = await getCurrentManager();
  const employee = manager ? null : await getCurrentEmployee();
  if (!manager && !employee) redirect("/login");

  await connectToDatabase();

  const workspaces = manager
    ? await Workspace.find({
        organizationId: manager.organizationId,
        isDeleted: false,
      }).sort({ createdAt: -1 })
    : await (async () => {
        const memberships = await WorkspaceMember.find({ employeeId: employee!._id });
        return Workspace.find({
          _id: { $in: memberships.map((m) => m.workspaceId) },
          isDeleted: false,
        }).sort({ createdAt: -1 });
      })();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
            Welcome, {manager ? manager.name : employee!.name}
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {manager ? "Your organization's workspaces." : "Your assigned workspaces."}
          </p>
        </div>
        {manager && (
          <Link
            href="/dashboard/trash"
            className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            <Trash2 size={16} />
            Trash
          </Link>
        )}
      </div>

      {manager && (
        <div className="mt-8">
          <CreateWorkspaceForm />
        </div>
      )}

      {workspaces.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-600 dark:text-neutral-400">
          {manager
            ? "No workspaces yet. Create your first one above."
            : "You haven't been assigned to any workspaces yet."}
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <Link
              key={workspace._id.toString()}
              href={`/dashboard/workspaces/${workspace._id.toString()}`}
              className="rounded-xl border border-neutral-200 p-5 transition hover:border-indigo-400 dark:border-neutral-800 dark:hover:border-indigo-500"
            >
              <h2 className="font-semibold text-neutral-900 dark:text-white">
                {workspace.title}
              </h2>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Created {new Date(workspace.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
