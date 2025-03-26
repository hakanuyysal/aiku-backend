import mongoose, { Document, Model, Schema } from 'mongoose';

// Mesaj arayüzü
export interface IMessage extends Document {
  // Mesajın ait olduğu sohbet oturumu
  chatSession: mongoose.Schema.Types.ObjectId;
  // Mesajı gönderen şirket
  sender: mongoose.Schema.Types.ObjectId;
  // Mesaj içeriği
  content: string;
  // Dosya eki (varsa)
  attachment?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    filePath: string;
  };
  // Mesaj okundu mu?
  isRead: boolean;
  // Oluşturulma tarihi
  createdAt: Date;
  // Güncelleme tarihi
  updatedAt: Date;
}

interface IMessageModel extends Model<IMessage> {}

const messageSchema = new Schema<IMessage>(
  {
    chatSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatSession',
      required: [true, 'Sohbet oturumu zorunludur'],
      index: true, // Sohbete göre mesajları hızlı sorgulama için index
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Gönderici zorunludur'],
    },
    content: {
      type: String,
      required: [true, 'Mesaj içeriği zorunludur'],
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
    timestamps: true, // createdAt ve updatedAt alanlarını otomatik ekler
  }
);

// Mesajların sohbet içinde oluşturulma tarihine göre sıralanması için index
messageSchema.index({ chatSession: 1, createdAt: 1 });

export const Message = mongoose.model<IMessage, IMessageModel>(
  'Message',
  messageSchema
); 