import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { KnowledgeChunk } from "@/models/KnowledgeChunk";
import { WorkspaceMember } from "@/models/WorkspaceMember";
import { embedText } from "@/lib/embeddings";
import type { SessionPayload } from "@/lib/session";

// Safe to import from Next.js API routes — unlike src/lib/ragIndexing.ts, this file
// never touches @blocknote/server-util (which can't be imported in that context; see
// docs/NOTES.md).

export const VECTOR_INDEX_NAME = "knowledge_chunks_vector_index";
const RETRIEVAL_LIMIT = 5;

export async function retrieveContext(session: SessionPayload, query: string) {
  await connectToDatabase();
  const queryEmbedding = await embedText(query);

  // Fetch extra candidates since Employee results get filtered further below.
  const candidates = await KnowledgeChunk.aggregate([
    {
      $vectorSearch: {
        index: VECTOR_INDEX_NAME,
        path: "embedding",
        queryVector: queryEmbedding,
        filter: { organizationId: new mongoose.Types.ObjectId(session.organizationId) },
        numCandidates: 100,
        limit: RETRIEVAL_LIMIT * 4,
      },
    },
    {
      $project: {
        text: 1,
        pageId: 1,
        workspaceId: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  if (session.userType === "manager") {
    return candidates.slice(0, RETRIEVAL_LIMIT);
  }

  const memberships = await WorkspaceMember.find({ employeeId: session.userId });
  const allowedWorkspaceIds = new Set(memberships.map((m) => m.workspaceId.toString()));

  return candidates
    .filter((chunk) => allowedWorkspaceIds.has(chunk.workspaceId.toString()))
    .slice(0, RETRIEVAL_LIMIT);
}
