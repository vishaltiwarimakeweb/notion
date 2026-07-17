import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IInvitation {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  invitedBy: mongoose.Types.ObjectId;
  email: string;
  token: string;
  status: "pending" | "accepted" | "expired";
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<IInvitation>(
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
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "Manager",
      required: true,
    },
    email: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired"],
      default: "pending",
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

invitationSchema.index({ token: 1 });

export const Invitation =
  (models.Invitation as Model<IInvitation>) ?? model<IInvitation>("Invitation", invitationSchema);
