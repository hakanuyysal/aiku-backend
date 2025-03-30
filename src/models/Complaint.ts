import mongoose, { Document, Model, Schema } from 'mongoose';

// Complaint türleri
export enum ComplaintType {
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  HARASSMENT = 'harassment',
  SPAM = 'spam',
  FALSE_INFORMATION = 'false_information',
  INTELLECTUAL_PROPERTY = 'intellectual_property',
  OTHER = 'other'
}

// Complaint interface
export interface IComplaint extends Document {
  // Şikayet edilen mesaj
  message: mongoose.Schema.Types.ObjectId;
  // Şikayeti yapan kullanıcı
  reporter: mongoose.Schema.Types.ObjectId;
  // Şikayet türü
  complaintType: ComplaintType;
  // Ek açıklama (opsiyonel)
  description?: string;
  // Şikayetin durumu
  status: 'pending' | 'reviewed' | 'resolved' | 'rejected';
  // Oluşturulma tarihi
  createdAt: Date;
  // Güncelleme tarihi
  updatedAt: Date;
}

interface IComplaintModel extends Model<IComplaint> {}

const complaintSchema = new Schema<IComplaint>(
  {
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: [true, 'Message is required'],
      index: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter is required'],
      index: true,
    },
    complaintType: {
      type: String,
      enum: Object.values(ComplaintType),
      required: [true, 'Complaint type is required'],
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'rejected'],
      default: 'pending',
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

// Şikayetlerin mesaj ve oluşturulma tarihine göre sıralanması için index
complaintSchema.index({ message: 1, createdAt: 1 });
// Şikayetlerin kullanıcıya göre sıralanması için index
complaintSchema.index({ reporter: 1, createdAt: 1 });

export const Complaint = mongoose.model<IComplaint, IComplaintModel>(
  'Complaint',
  complaintSchema
); 