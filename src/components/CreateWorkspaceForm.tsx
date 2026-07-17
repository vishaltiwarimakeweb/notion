"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function CreateWorkspaceForm() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to create workspace.");
        return;
      }

      toast.success("Workspace created.");
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
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Plus size={16} />
        New workspace
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <Input
        label="Workspace name"
        name="title"
        minLength={6}
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
