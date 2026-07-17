import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IMessage {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userType: "manager" | "employee";
  message: string;
  sender: "user" | "assistant";
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, required: true },
    userType: { type: String, enum: ["manager", "employee"], required: true },
    message: { type: String, required: true, minlength: 1 },
    sender: { type: String, enum: ["user", "assistant"], required: true },
  },
  { timestamps: true }
);

messageSchema.index({ userId: 1, createdAt: 1 });

export const Message =
  (models.Message as Model<IMessage>) ?? model<IMessage>("Message", messageSchema);
