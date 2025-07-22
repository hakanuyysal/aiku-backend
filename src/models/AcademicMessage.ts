import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAcademicMessage extends Document {
  chatSession: mongoose.Schema.Types.ObjectId;
  sender?: mongoose.Schema.Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IAcademicMessageModel extends Model<IAcademicMessage> {}

const academicMessageSchema = new Schema<IAcademicMessage>(
  {
    chatSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicChatSession",
      required: [true, "Akademik sohbet oturumu zorunludur"],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    content: {
      type: String,
      required: [true, "Mesaj içeriği zorunludur"],
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'acaimessages',
  }
);

academicMessageSchema.index({ chatSession: 1, createdAt: 1 });

export const AcademicMessage = mongoose.model<IAcademicMessage, IAcademicMessageModel>(
  "AcademicMessage",
  academicMessageSchema
); 