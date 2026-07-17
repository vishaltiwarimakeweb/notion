import { notFound, redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getAccessiblePage } from "@/lib/pages";
import { Favorite } from "@/models/Favorite";
import { Page } from "@/models/Page";
import { PageEditorClient as PageEditor } from "@/components/PageEditorClient";
import { PageSettings } from "@/components/PageSettings";
import { FavoriteButton } from "@/components/FavoriteButton";
import { CreatePageForm } from "@/components/CreatePageForm";
import { PageTree } from "@/components/PageTree";

export default async function PageEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  const { id } = await params;
  const page = await getAccessiblePage(id, session);
  if (!page) notFound();

  const [favorite, childPages] = await Promise.all([
    Favorite.findOne({ userId: session.userId, pageId: page._id }),
    Page.find({ parentPageId: page._id, isDeleted: false }).sort({ createdAt: 1 }),
  ]);

  const childTree = childPages.map((child) => ({
    id: child._id.toString(),
    title: child.title,
    parentPageId: page._id.toString(),
  }));

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
          {page.title}
        </h1>
        <FavoriteButton pageId={page._id.toString()} initialFavorited={Boolean(favorite)} />
      </div>

      <PageEditor pageId={page._id.toString()} userName={session.email} />

      <div className="mt-10 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
          Nested pages
        </h2>
        <div className="mt-3">
          <CreatePageForm
            workspaceId={page.workspaceId.toString()}
            parentPageId={page._id.toString()}
          />
          <div className="mt-4">
            <PageTree pages={childTree} />
          </div>
        </div>
      </div>

      <PageSettings
        id={page._id.toString()}
        title={page.title}
        workspaceId={page.workspaceId.toString()}
      />
    </div>
  );
}
