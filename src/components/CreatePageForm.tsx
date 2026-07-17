"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function CreatePageForm({
  workspaceId,
  parentPageId,
}: {
  workspaceId: string;
  parentPageId?: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, parentPageId }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to create page.");
        return;
      }

      toast.success("Page created.");
      setTitle("");
      setIsOpen(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <Button variant="secondary" onClick={() => setIsOpen(true)} className="gap-2">
        <Plus size={16} />
        {parentPageId ? "New nested page" : "New page"}
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <Input
        label="Page title"
        name="title"
        minLength={3}
        required
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Button type="submit" isLoading={isLoading}>
        Create
      </Button>
      <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}
