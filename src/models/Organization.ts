import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IOrganization {
  _id: mongoose.Types.ObjectId;
  name: string;
  billingPlan: "free" | "pro" | "enterprise";
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, minlength: 5 },
    billingPlan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },
  },
  { timestamps: true }
);

organizationSchema.index({ name: 1 });

export const Organization =
  (models.Organization as Model<IOrganization>) ??
  model<IOrganization>("Organization", organizationSchema);
