"use client";

import { useEffect, useMemo, useState } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/core/style.css";
import "@blocknote/shadcn/style.css";
import { toast } from "react-toastify";
import { useTheme } from "@/components/ThemeProvider";
import { COLLAB_FRAGMENT_NAME } from "@/lib/collab";

const COLLAB_WS_URL = process.env.NEXT_PUBLIC_COLLAB_WS_URL ?? "ws://localhost:1234";

// Deterministic color per user so the same person always gets the same cursor color.
function colorForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${hash % 360}, 70%, 50%)`;
}

export function PageEditor({ pageId, userName }: { pageId: string; userName: string }) {
  const { theme } = useTheme();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/pages/${pageId}/collab-token`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setToken(data.token ?? null);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to connect to the collaborative editor.");
      });
    return () => {
      cancelled = true;
    };
  }, [pageId]);

  if (!token) {
    return (
      <div className="mt-6 rounded-xl border border-neutral-200 p-6 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        Connecting…
      </div>
    );
  }

  return (
    <ConnectedEditor pageId={pageId} token={token} userName={userName} theme={theme} />
  );
}

function ConnectedEditor({
  pageId,
  token,
  userName,
  theme,
}: {
  pageId: string;
  token: string;
  userName: string;
  theme: "light" | "dark";
}) {
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">(
    "connecting"
  );

  const { doc, provider } = useMemo(() => {
    const doc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: COLLAB_WS_URL,
      name: pageId,
      document: doc,
      token,
      onStatus: ({ status }) => setStatus(status),
    });
    return { doc, provider };
  }, [pageId, token]);

  useEffect(() => {
    return () => {
      provider.destroy();
      doc.destroy();
    };
  }, [provider, doc]);

  const editor = useCreateBlockNote({
    collaboration: {
      provider: { awareness: provider.awareness ?? undefined },
      fragment: doc.getXmlFragment(COLLAB_FRAGMENT_NAME),
      user: { name: userName, color: colorForName(userName) },
    },
  });

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center gap-1.5 border-b border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            status === "connected" ? "bg-emerald-500" : "bg-amber-500"
          }`}
        />
        {status === "connected" ? "Live" : status === "connecting" ? "Connecting…" : "Disconnected"}
      </div>
      <BlockNoteView editor={editor} theme={theme} />
    </div>
  );
}
