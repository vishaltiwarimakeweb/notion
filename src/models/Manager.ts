import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IManager {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  avatar: string | null;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

const managerSchema = new Schema<IManager>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: { type: String, required: true, minlength: 2 },
    avatar: { type: String, default: null },
    email: {
      type: String,
      required: true,
      unique: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: { type: String, required: true, minlength: 8 },
  },
  { timestamps: true }
);

managerSchema.index({ name: 1 });

export const Manager =
  (models.Manager as Model<IManager>) ?? model<IManager>("Manager", managerSchema);
