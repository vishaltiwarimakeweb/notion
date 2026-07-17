"use client";

import { useRef } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import type { PartialBlock } from "@blocknote/core";
import "@blocknote/core/style.css";
import "@blocknote/shadcn/style.css";
import { toast } from "react-toastify";
import { useTheme } from "@/components/ThemeProvider";

const SAVE_DEBOUNCE_MS = 1000;

export function PageEditor({
  pageId,
  initialBlocks,
}: {
  pageId: string;
  initialBlocks: PartialBlock[];
}) {
  const { theme } = useTheme();
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useCreateBlockNote({
    initialContent: initialBlocks.length > 0 ? initialBlocks : undefined,
  });

  function handleChange() {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/pages/${pageId}/content`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blocks: editor.document }),
        });
        if (!res.ok) throw new Error();
      } catch {
        toast.error("Failed to save changes.");
      }
    }, SAVE_DEBOUNCE_MS);
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <BlockNoteView editor={editor} theme={theme} onChange={handleChange} />
    </div>
  );
}
