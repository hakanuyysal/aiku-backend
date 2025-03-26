import mongoose, { Document, Model, Schema } from 'mongoose';

// Sohbet oturumu arayüzü
export interface IChatSession extends Document {
  // Sohbeti başlatan şirket
  initiatorCompany: mongoose.Schema.Types.ObjectId;
  // Sohbetin hedef şirketi
  targetCompany: mongoose.Schema.Types.ObjectId;
  // Sohbet başlığı
  title: string;
  // Son mesaj metni
  lastMessageText?: string;
  // Son mesajı gönderen
  lastMessageSender?: mongoose.Schema.Types.ObjectId;
  // Son mesaj tarihi
  lastMessageDate?: Date;
  // Okunmamış mesaj sayısı (initiator için)
  unreadCountInitiator: number;
  // Okunmamış mesaj sayısı (target için)
  unreadCountTarget: number;
  // Başlatan şirket için arşivlenmiş mi
  archivedByInitiator: boolean;
  // Hedef şirket için arşivlenmiş mi
  archivedByTarget: boolean;
  // Başlatan şirket tarafından silinmiş mi
  deletedByInitiator: boolean;
  // Hedef şirket tarafından silinmiş mi
  deletedByTarget: boolean;
  // Oluşturulma tarihi
  createdAt: Date;
  // Güncelleme tarihi
  updatedAt: Date;
}

interface IChatSessionModel extends Model<IChatSession> {}

const chatSessionSchema = new Schema<IChatSession>(
  {
    initiatorCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Başlatan şirket zorunludur'],
    },
    targetCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Hedef şirket zorunludur'],
    },
    title: {
      type: String,
      required: [true, 'Sohbet başlığı zorunludur'],
      trim: true,
    },
    lastMessageText: {
      type: String,
      trim: true,
    },
    lastMessageSender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    lastMessageDate: {
      type: Date,
    },
    unreadCountInitiator: {
      type: Number,
      default: 0,
    },
    unreadCountTarget: {
      type: Number,
      default: 0,
    },
    archivedByInitiator: {
      type: Boolean,
      default: false,
    },
    archivedByTarget: {
      type: Boolean,
      default: false,
    },
    deletedByInitiator: {
      type: Boolean,
      default: false,
    },
    deletedByTarget: {
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

// İki şirket arasında benzersiz sohbet oturumu oluşturmak için bileşik index
chatSessionSchema.index(
  { initiatorCompany: 1, targetCompany: 1 },
  { unique: true }
);

export const ChatSession = mongoose.model<IChatSession, IChatSessionModel>(
  'ChatSession',
  chatSessionSchema
); 