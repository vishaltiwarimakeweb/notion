import { embed, embedMany as aiEmbedMany } from "ai";
import { openai } from "@ai-sdk/openai";

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";
const CHUNK_SIZE = 1500;

function getModel() {
  return openai.textEmbeddingModel(EMBEDDING_MODEL);
}

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: getModel(), value: text });
  return embedding;
}

export async function embedMany(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const { embeddings } = await aiEmbedMany({ model: getModel(), values: texts });
  return embeddings;
}

// Simple fixed-size split, no overlap — enough to stay within embedding input
// limits and give retrieval reasonable granularity for a knowledge-base Q&A feature.
export function chunkText(text: string, maxChars = CHUNK_SIZE): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const chunks: string[] = [];
  for (let i = 0; i < trimmed.length; i += maxChars) {
    chunks.push(trimmed.slice(i, i + maxChars));
  }
  return chunks;
}
