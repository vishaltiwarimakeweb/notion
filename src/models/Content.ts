import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IContent {
  _id: mongoose.Types.ObjectId;
  pageId: mongoose.Types.ObjectId;
  blocks: unknown[];
  yjsState: Buffer | null;
  createdAt: Date;
  updatedAt: Date;
}

const contentSchema = new Schema<IContent>(
  {
    pageId: {
      type: Schema.Types.ObjectId,
      ref: "Page",
      required: true,
      unique: true,
    },
    // Derived read cache, written by the collaboration server (src/lib/pages.ts callers
    // no longer write this directly) — kept for anything that wants plain-JSON reads
    // without decoding Yjs (e.g. future RAG text extraction).
    blocks: { type: Schema.Types.Mixed, default: [] },
    // Source of truth once a page has been opened collaboratively at least once.
    yjsState: { type: Buffer, default: null },
  },
  { timestamps: true }
);

export const Content =
  (models.Content as Model<IContent>) ?? model<IContent>("Content", contentSchema);
