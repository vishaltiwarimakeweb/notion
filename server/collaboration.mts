// Standalone real-time collaboration server (Yjs via Hocuspocus). Not part of the
// Next.js app — not routed, not bundled by `next build`. Run with `npm run dev:collab`
// locally (loads .env.local via node's --env-file flag); deploy as its own
// long-running service in production.
import { Server } from "@hocuspocus/server";
import * as Y from "yjs";
import { ServerBlockNoteEditor } from "@blocknote/server-util";
import { verifyCollabToken } from "../src/lib/collabToken";
import { COLLAB_FRAGMENT_NAME } from "../src/lib/collab";
import { connectToDatabase } from "../src/lib/db";
import { Content } from "../src/models/Content";
import { reindexPage } from "../src/lib/ragIndexing";

const port = Number(process.env.COLLAB_PORT ?? 1234);

const server = new Server({
  port,

  async onAuthenticate({ token, documentName }) {
    const payload = await verifyCollabToken(token);
    if (!payload || payload.pageId !== documentName) {
      throw new Error("Not authorized.");
    }
  },

  async onLoadDocument({ documentName, document }) {
    await connectToDatabase();
    const content = await Content.findOne({ pageId: documentName });

    if (content?.yjsState) {
      Y.applyUpdate(document, content.yjsState);
      return;
    }

    // First time this page has ever been opened collaboratively — bootstrap the
    // Yjs document from its existing plain-JSON blocks (pre-Phase-4 pages), if any.
    if (content?.blocks && Array.isArray(content.blocks)) {
      const editor = ServerBlockNoteEditor.create();
      const fragment = document.getXmlFragment(COLLAB_FRAGMENT_NAME);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.blocksToYXmlFragment(content.blocks as any, fragment);
    }
  },

  async onStoreDocument({ documentName, document }) {
    await connectToDatabase();
    const editor = ServerBlockNoteEditor.create();
    const blocks = editor.yDocToBlocks(document, COLLAB_FRAGMENT_NAME);
    const yjsState = Buffer.from(Y.encodeStateAsUpdate(document));

    await Content.findOneAndUpdate(
      { pageId: documentName },
      { yjsState, blocks },
      { upsert: true }
    );

    // Keep the AI assistant's knowledge base in sync. Best-effort: a reindex failure
    // (e.g. embeddings API down) shouldn't prevent the actual content save above.
    try {
      await reindexPage(documentName);
    } catch (error) {
      console.error(`Failed to reindex page ${documentName} for the knowledge base:`, error);
    }
  },
});

server.listen().then(() => {
  console.log(`Collaboration server listening on ws://localhost:${port}`);
});
