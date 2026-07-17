"use client";

import dynamic from "next/dynamic";

// Blocknote/ProseMirror touch `window` during module init, so it can't be
// server-rendered at all — must be excluded from SSR, not just hydration-guarded.
export const PageEditorClient = dynamic(
  () => import("@/components/PageEditor").then((mod) => mod.PageEditor),
  { ssr: false }
);
