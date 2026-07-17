"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";

export function RestoreWorkspaceButton({ id }: { id: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleRestore() {
    setIsLoading(true);

    try {
      const res = await fetch(`/api/workspaces/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDeleted: false }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to restore workspace.");
        return;
      }

      toast.success("Workspace restored.");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button variant="secondary" isLoading={isLoading} onClick={handleRestore}>
      Restore
    </Button>
  );
}
