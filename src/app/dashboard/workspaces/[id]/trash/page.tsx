import { notFound, redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getAccessibleWorkspace } from "@/lib/workspaces";
import { Page } from "@/models/Page";
import { RestorePageButton } from "@/components/RestorePageButton";

export default async function WorkspaceTrashPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  const { id } = await params;
  const workspace = await getAccessibleWorkspace(id, session);
  if (!workspace) notFound();

  const pages = await Page.find({ workspaceId: workspace._id, isDeleted: true }).sort({
    deletedAt: -1,
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
        Trash — {workspace.title}
      </h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Deleted pages are kept here until restored.
      </p>

      {pages.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-600 dark:text-neutral-400">
          Trash is empty.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {pages.map((page) => (
            <li
              key={page._id.toString()}
              className="flex items-center justify-between rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">{page.title}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Deleted{" "}
                  {page.deletedAt ? new Date(page.deletedAt).toLocaleDateString() : ""}
                </p>
              </div>
              <RestorePageButton id={page._id.toString()} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
