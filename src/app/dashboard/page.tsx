import { redirect } from "next/navigation";
import { getCurrentManager } from "@/lib/auth";

export default async function DashboardPage() {
  const manager = await getCurrentManager();
  if (!manager) redirect("/login");

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
        Welcome, {manager.name}
      </h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Your workspaces will show up here soon.
      </p>
    </div>
  );
}
