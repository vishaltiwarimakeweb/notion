"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function WorkspaceSettings({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [name, setName] = useState(title);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleRename(event: FormEvent) {
    event.preventDefault();
    setIsRenaming(true);

    try {
      const res = await fetch(`/api/workspaces/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: name }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to rename workspace.");
        return;
      }

      toast.success("Workspace renamed.");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsRenaming(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/workspaces/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete workspace.");
        return;
      }

      toast.success("Workspace moved to trash.");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="mt-8 flex flex-col gap-8">
      <form onSubmit={handleRename} className="flex items-end gap-3">
        <Input
          label="Workspace name"
          name="title"
          minLength={6}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" isLoading={isRenaming}>
          Save
        </Button>
      </form>

      <div className="rounded-lg border border-red-200 p-4 dark:border-red-900">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
          Danger zone
        </h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Moves this workspace to trash. You can restore it later.
        </p>
        <Button
          variant="secondary"
          isLoading={isDeleting}
          onClick={handleDelete}
          className="mt-3 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
        >
          Delete workspace
        </Button>
      </div>
    </div>
  );
}
