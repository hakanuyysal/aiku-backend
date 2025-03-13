import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export interface ISavedCard extends Document {
  userId: mongoose.Types.ObjectId;
  cardToken: string;
  cardMaskedNumber: string;
  cardHolderName: string;
  cardExpireMonth: string;
  cardExpireYear: string;
  cardType: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SavedCardSchema: Schema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cardToken: {
    type: String,
    required: true
  },
  cardMaskedNumber: {
    type: String,
    required: true
  },
  cardHolderName: {
    type: String,
    required: true
  },
  cardExpireMonth: {
    type: String,
    required: true
  },
  cardExpireYear: {
    type: String,
    required: true
  },
  cardType: {
    type: String,
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default mongoose.model<ISavedCard>('SavedCard', SavedCardSchema); 