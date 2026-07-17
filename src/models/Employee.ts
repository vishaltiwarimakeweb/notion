import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IEmployee {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  avatar: string | null;
  email: string;
  oAuth: "Google" | "Github";
  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new Schema<IEmployee>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: { type: String, required: true, minlength: 2 },
    avatar: { type: String, default: null },
    email: { type: String, required: true },
    oAuth: { type: String, enum: ["Google", "Github"], required: true },
  },
  { timestamps: true }
);

employeeSchema.index({ name: 1 });
employeeSchema.index({ organizationId: 1, email: 1 }, { unique: true });

export const Employee =
  (models.Employee as Model<IEmployee>) ?? model<IEmployee>("Employee", employeeSchema);
