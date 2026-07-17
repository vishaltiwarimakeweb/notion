import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IFavorite {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userType: "manager" | "employee";
  pageId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const favoriteSchema = new Schema<IFavorite>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    userType: { type: String, enum: ["manager", "employee"], required: true },
    pageId: { type: Schema.Types.ObjectId, ref: "Page", required: true },
  },
  { timestamps: true }
);

favoriteSchema.index({ userId: 1, pageId: 1 }, { unique: true });

export const Favorite =
  (models.Favorite as Model<IFavorite>) ?? model<IFavorite>("Favorite", favoriteSchema);
