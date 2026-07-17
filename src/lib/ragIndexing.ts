import mongoose from "mongoose";
import { ServerBlockNoteEditor } from "@blocknote/server-util";
import { connectToDatabase } from "@/lib/db";
import { KnowledgeChunk } from "@/models/KnowledgeChunk";
import { Page } from "@/models/Page";
import { Content } from "@/models/Content";
import { embedMany, chunkText } from "@/lib/embeddings";

// Only import this from plain Node contexts (server/collaboration.mts, scripts/) —
// @blocknote/server-util calls React.createContext at module-eval time, which Next.js's
// RSC/route bundler rejects outside a "use client" boundary. Never import this from
// src/app/**; use src/lib/rag.ts's retrieveContext there instead.

// Called after every content save (server/collaboration.mts's onStoreDocument) and by
// the one-time backfill script — deletes this page's old chunks and re-embeds from
// its current content, so the knowledge base stays in sync automatically.
export async function reindexPage(pageId: string | mongoose.Types.ObjectId) {
  await connectToDatabase();

  const page = await Page.findById(pageId);
  await KnowledgeChunk.deleteMany({ pageId });
  if (!page || page.isDeleted) return;

  const content = await Content.findOne({ pageId: page._id });
  if (!content?.blocks || !Array.isArray(content.blocks) || content.blocks.length === 0) {
    return;
  }

  const editor = ServerBlockNoteEditor.create();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text = await editor.blocksToMarkdownLossy(content.blocks as any);
  const chunks = chunkText(text);
  if (chunks.length === 0) return;

  const embeddings = await embedMany(chunks);

  await KnowledgeChunk.insertMany(
    chunks.map((chunkedText, index) => ({
      organizationId: page.organizationId,
      workspaceId: page.workspaceId,
      pageId: page._id,
      chunkIndex: index,
      text: chunkedText,
      embedding: embeddings[index],
    }))
  );
}
