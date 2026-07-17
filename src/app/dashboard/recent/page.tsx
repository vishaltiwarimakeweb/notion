import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { getSessionFromCookies } from "@/lib/auth";
import { getRecentlyVisitedPages } from "@/lib/recentlyVisited";

export default async function RecentlyVisitedPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  const results = await getRecentlyVisitedPages(session);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
        Recently visited
      </h1>

      {results.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-600 dark:text-neutral-400">
          You haven&apos;t visited any pages yet.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-2">
          {results.map(({ page, visitedAt }) => (
            <li key={page._id.toString()}>
              <Link
                href={`/dashboard/pages/${page._id.toString()}`}
                className="flex items-center justify-between rounded-xl border border-neutral-200 p-4 hover:border-indigo-400 dark:border-neutral-800 dark:hover:border-indigo-500"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-white">
                  <FileText size={14} />
                  {page.title}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {new Date(visitedAt).toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
