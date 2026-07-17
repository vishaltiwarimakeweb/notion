import Link from "next/link";
import { FileText } from "lucide-react";

export type PageTreeNode = {
  id: string;
  title: string;
  parentPageId: string | null;
};

function renderChildren(pages: PageTreeNode[], parentId: string | null) {
  const children = pages.filter((p) => p.parentPageId === parentId);
  if (children.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1">
      {children.map((page) => (
        <li key={page.id}>
          <Link
            href={`/dashboard/pages/${page.id}`}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <FileText size={14} />
            {page.title}
          </Link>
          <div className="ml-5 border-l border-neutral-200 pl-2 dark:border-neutral-800">
            {renderChildren(pages, page.id)}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PageTree({ pages }: { pages: PageTreeNode[] }) {
  if (pages.length === 0) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">No pages yet.</p>
    );
  }

  return renderChildren(pages, null);
}
