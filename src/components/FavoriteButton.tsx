"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "react-toastify";

export function FavoriteButton({
  pageId,
  initialFavorited,
}: {
  pageId: string;
  initialFavorited: boolean;
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [isLoading, setIsLoading] = useState(false);

  async function toggle() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/pages/${pageId}/favorite`, {
        method: favorited ? "DELETE" : "POST",
      });
      if (!res.ok) throw new Error();
      setFavorited(!favorited);
    } catch {
      toast.error("Failed to update favorite.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isLoading}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-800"
    >
      <Star
        size={18}
        className={favorited ? "fill-amber-400 text-amber-400" : ""}
      />
    </button>
  );
}
