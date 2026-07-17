// One-time, idempotent setup: creates the Atlas Vector Search index the RAG
// assistant needs. Run with `npm run setup:vector-index`. Safe to re-run — skips
// creation if an index with this name already exists.
import { connectToDatabase } from "../src/lib/db";
import { VECTOR_INDEX_NAME } from "../src/lib/rag";

async function main() {
  const mongoose = await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection not available.");

  const collection = db.collection("knowledgechunks");

  const existing = await collection.listSearchIndexes(VECTOR_INDEX_NAME).toArray();
  if (existing.length > 0) {
    console.log(`Index "${VECTOR_INDEX_NAME}" already exists — nothing to do.`);
    process.exit(0);
  }

  await collection.createSearchIndex({
    name: VECTOR_INDEX_NAME,
    type: "vectorSearch",
    definition: {
      fields: [
        {
          type: "vector",
          path: "embedding",
          numDimensions: 1536,
          similarity: "cosine",
        },
        {
          type: "filter",
          path: "organizationId",
        },
      ],
    },
  });

  console.log(
    `Created index "${VECTOR_INDEX_NAME}". It may take a minute or two to finish building on Atlas before it's queryable.`
  );
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to create the vector search index:", error);
  process.exit(1);
});
