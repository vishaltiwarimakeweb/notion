"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import type { useCreateBlockNote } from "@blocknote/react";
import type { InlineAiAction } from "@/lib/inlineAi";

type BlockNoteEditor = ReturnType<typeof useCreateBlockNote>;

const ACTIONS: { action: InlineAiAction; label: string }[] = [
  { action: "elaborate", label: "Elaborate" },
  { action: "compact", label: "Compact" },
  { action: "fix-grammar", label: "Fix grammar" },
  { action: "enhance", label: "Enhance" },
];

export function InlineAiToolbar({ editor }: { editor: BlockNoteEditor }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [activeAction, setActiveAction] = useState<InlineAiAction | null>(null);

  useEffect(() => {
    return editor.onSelectionChange(() => {
      const selectedText = editor.getSelectedText();
      const domSelection = window.getSelection();

      if (!selectedText.trim() || !domSelection || domSelection.rangeCount === 0) {
        setPosition(null);
        return;
      }

      const rect = domSelection.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setPosition(null);
        return;
      }

      setPosition({ top: rect.top + window.scrollY - 44, left: rect.left + window.scrollX });
    });
  }, [editor]);

  if (!position) return null;

  async function handleAction(action: InlineAiAction) {
    const selectedText = editor.getSelectedText();
    if (!selectedText.trim()) return;

    setActiveAction(action);
    try {
      const res = await fetch("/api/ai/inline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, text: selectedText }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "AI request failed.");
        return;
      }

      editor.pasteText(data.result);
      setPosition(null);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <div
      className="fixed z-50 flex gap-1 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
      style={{ top: position.top, left: position.left }}
    >
      {ACTIONS.map(({ action, label }) => (
        <button
          key={action}
          type="button"
          disabled={activeAction !== null}
          onClick={() => handleAction(action)}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {activeAction === action ? "…" : label}
        </button>
      ))}
    </div>
  );
}
