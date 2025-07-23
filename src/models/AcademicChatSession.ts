import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAcademicChatSession extends Document {
  user?: mongoose.Schema.Types.ObjectId;
  participantName?: string;
  title?: string;
  lastMessageText?: string;
  lastMessageDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface IAcademicChatSessionModel extends Model<IAcademicChatSession> { }

const academicChatSessionSchema = new Schema<IAcademicChatSession>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    participantName: {
      type: String,
      trim: true,
      required: false,
    },
    title: {
      type: String,
      trim: true,
    },
    lastMessageText: {
      type: String,
      trim: true,
    },
    lastMessageDate: {
      type: Date,
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
    collection: 'acaichatsession',
  }
);

academicChatSessionSchema.index({ user: 1, updatedAt: -1 });
academicChatSessionSchema.index({ participantName: 1 });

export const AcademicChatSession = mongoose.model<IAcademicChatSession, IAcademicChatSessionModel>(
  'AcademicChatSession',
  academicChatSessionSchema
); 