// One-time: reindexes every existing non-deleted page's knowledge-base entry. Needed
// because pages created before this phase won't get (re-)embedded until their next
// content save. Run with `npm run backfill:embeddings` after the vector index exists.
import { connectToDatabase } from "../src/lib/db";
import { Page } from "../src/models/Page";
import { reindexPage } from "../src/lib/ragIndexing";

async function main() {
  await connectToDatabase();

  const pages = await Page.find({ isDeleted: false }, "_id title");
  console.log(`Reindexing ${pages.length} page(s)...`);

  let succeeded = 0;
  let failed = 0;

  for (const page of pages) {
    try {
      await reindexPage(page._id);
      succeeded++;
    } catch (error) {
      failed++;
      console.error(`Failed to reindex "${page.title}" (${page._id.toString()}):`, error);
    }
  }

  console.log(`Done. ${succeeded} succeeded, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
