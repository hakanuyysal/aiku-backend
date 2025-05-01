import mongoose, { Document, Model, Schema } from "mongoose";

export interface IMessage extends Document {
  chatSession: mongoose.Schema.Types.ObjectId;

  sender: mongoose.Schema.Types.ObjectId;

  content: string;

  attachment?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    filePath: string;
  };

  isReplyable: boolean;

  isRead: boolean;

  createdAt: Date;

  updatedAt: Date;
}

interface IMessageModel extends Model<IMessage> {}

const messageSchema = new Schema<IMessage>(
  {
    chatSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatSession",
      required: [true, "Sohbet oturumu zorunludur"],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Gönderici zorunludur"],
    },
    content: {
      type: String,
      required: [true, "Mesaj içeriği zorunludur"],
      trim: true,
    },
    attachment: {
      fileName: {
        type: String,
        trim: true,
      },
      fileType: {
        type: String,
        trim: true,
      },
      fileSize: {
        type: Number,
      },
      filePath: {
        type: String,
        trim: true,
      },
    },
    isReplyable: {
      type: Boolean,
      default: true,
    },
    isRead: {
      type: Boolean,
      default: false,
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
  }
);

messageSchema.index({ chatSession: 1, createdAt: 1 });

export const Message = mongoose.model<IMessage, IMessageModel>(
  "Message",
  messageSchema
);
