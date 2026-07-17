import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IWorkspaceMember {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceMemberSchema = new Schema<IWorkspaceMember>(
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
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
  },
  { timestamps: true }
);

workspaceMemberSchema.index({ workspaceId: 1, employeeId: 1 }, { unique: true });

export const WorkspaceMember =
  (models.WorkspaceMember as Model<IWorkspaceMember>) ??
  model<IWorkspaceMember>("WorkspaceMember", workspaceMemberSchema);
