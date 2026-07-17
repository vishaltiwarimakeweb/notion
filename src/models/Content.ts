import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IContent {
  _id: mongoose.Types.ObjectId;
  pageId: mongoose.Types.ObjectId;
  blocks: unknown[];
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
    blocks: { type: Schema.Types.Mixed, default: [] },
  },
  { timestamps: true }
);

export const Content =
  (models.Content as Model<IContent>) ?? model<IContent>("Content", contentSchema);
