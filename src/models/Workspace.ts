import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IWorkspace {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  title: string;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceSchema = new Schema<IWorkspace>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    title: { type: String, required: true, minlength: 6 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

workspaceSchema.index({ title: 1 });

export const Workspace =
  (models.Workspace as Model<IWorkspace>) ?? model<IWorkspace>("Workspace", workspaceSchema);
