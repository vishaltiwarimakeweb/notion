import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IRecentlyVisited {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userType: "manager" | "employee";
  pageId: mongoose.Types.ObjectId;
  visitedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const recentlyVisitedSchema = new Schema<IRecentlyVisited>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    userType: { type: String, enum: ["manager", "employee"], required: true },
    pageId: { type: Schema.Types.ObjectId, ref: "Page", required: true },
    visitedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

recentlyVisitedSchema.index({ userId: 1, pageId: 1 }, { unique: true });

export const RecentlyVisited =
  (models.RecentlyVisited as Model<IRecentlyVisited>) ??
  model<IRecentlyVisited>("RecentlyVisited", recentlyVisitedSchema);
