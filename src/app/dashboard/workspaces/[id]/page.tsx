import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { getSessionFromCookies } from "@/lib/auth";
import { getAccessibleWorkspace } from "@/lib/workspaces";
import { Page } from "@/models/Page";
import { WorkspaceSettings } from "@/components/WorkspaceSettings";
import { InviteMemberForm } from "@/components/InviteMemberForm";
import { CreatePageForm } from "@/components/CreatePageForm";
import { PageTree } from "@/components/PageTree";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  const { id } = await params;
  const workspace = await getAccessibleWorkspace(id, session);
  if (!workspace) notFound();

  const pages = await Page.find({ workspaceId: workspace._id, isDeleted: false }).sort({
    createdAt: 1,
  });
  const pageTree = pages.map((page) => ({
    id: page._id.toString(),
    title: page.title,
    parentPageId: page.parentPageId?.toString() ?? null,
  }));

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
          {workspace.title}
        </h1>
        <Link
          href={`/dashboard/workspaces/${workspace._id.toString()}/trash`}
          className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          <Trash2 size={16} />
          Trash
        </Link>
      </div>

      <div className="mt-8">
        <CreatePageForm workspaceId={workspace._id.toString()} />
        <div className="mt-4">
          <PageTree pages={pageTree} />
        </div>
      </div>

      {session.userType === "manager" ? (
        <>
          <div className="mt-8">
            <InviteMemberForm workspaceId={workspace._id.toString()} />
          </div>
          <WorkspaceSettings id={workspace._id.toString()} title={workspace.title} />
        </>
      ) : null}
    </div>
  );
}
