"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function PageSettings({
  id,
  title,
  workspaceId,
}: {
  id: string;
  title: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(title);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleRename(event: FormEvent) {
    event.preventDefault();
    setIsRenaming(true);

    try {
      const res = await fetch(`/api/pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: name }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to rename page.");
        return;
      }

      toast.success("Page renamed.");
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
      const res = await fetch(`/api/pages/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete page.");
        return;
      }

      toast.success("Page moved to trash.");
      router.push(`/dashboard/workspaces/${workspaceId}`);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      <form onSubmit={handleRename} className="flex items-end gap-3">
        <Input
          label="Page title"
          name="title"
          minLength={3}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" isLoading={isRenaming}>
          Save
        </Button>
      </form>

      <Button
        variant="secondary"
        isLoading={isDeleting}
        onClick={handleDelete}
        className="w-fit bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
      >
        Delete page
      </Button>
    </div>
  );
}
