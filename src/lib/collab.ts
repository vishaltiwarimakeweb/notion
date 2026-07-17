// Shared between the Next.js app (src/components/PageEditor.tsx) and the standalone
// collaboration server (server/collaboration.ts) — both must agree on the same fragment
// name for a page's Yjs document to sync correctly.
export const COLLAB_FRAGMENT_NAME = "blocknote-content";
