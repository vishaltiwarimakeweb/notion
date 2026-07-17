import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IPage {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  parentPageId: mongoose.Types.ObjectId | null;
  title: string;
  createdBy: mongoose.Types.ObjectId;
  createdByType: "manager" | "employee";
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const pageSchema = new Schema<IPage>(
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
    parentPageId: {
      type: Schema.Types.ObjectId,
      ref: "Page",
      default: null,
    },
    title: { type: String, required: true, minlength: 3 },
    createdBy: { type: Schema.Types.ObjectId, required: true },
    createdByType: { type: String, enum: ["manager", "employee"], required: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

pageSchema.index({ title: 1 });
pageSchema.index({ workspaceId: 1, parentPageId: 1 });

export const Page = (models.Page as Model<IPage>) ?? model<IPage>("Page", pageSchema);
