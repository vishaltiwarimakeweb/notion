import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IKnowledgeChunk {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  pageId: mongoose.Types.ObjectId;
  chunkIndex: number;
  text: string;
  embedding: number[];
  createdAt: Date;
  updatedAt: Date;
}

const knowledgeChunkSchema = new Schema<IKnowledgeChunk>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    pageId: { type: Schema.Types.ObjectId, ref: "Page", required: true },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
  },
  { timestamps: true }
);

knowledgeChunkSchema.index({ pageId: 1 });

export const KnowledgeChunk =
  (models.KnowledgeChunk as Model<IKnowledgeChunk>) ??
  model<IKnowledgeChunk>("KnowledgeChunk", knowledgeChunkSchema);
